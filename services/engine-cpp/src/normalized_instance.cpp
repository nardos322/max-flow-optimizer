#include "engine/normalized_instance.hpp"

#include <algorithm>
#include <cstddef>
#include <limits>
#include <string>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "engine/error.hpp"

namespace engine {
namespace {

template <typename T, typename Accessor>
std::vector<const T*> SortById(const std::vector<T>& items, Accessor accessor) {
  std::vector<const T*> sorted;
  sorted.reserve(items.size());
  for (const T& item : items) {
    sorted.push_back(&item);
  }

  std::sort(sorted.begin(), sorted.end(), [&](const T* lhs, const T* rhs) {
    return accessor(*lhs) < accessor(*rhs);
  });

  for (std::size_t index = 1; index < sorted.size(); ++index) {
    if (accessor(*sorted[index - 1]) == accessor(*sorted[index])) {
      ThrowInvalidInput("Duplicate id found while normalizing input: " + accessor(*sorted[index]) + ".");
    }
  }

  return sorted;
}

int ParsePositivePrefixedId(std::string_view value, char prefix) {
  if (value.size() < 2 || value.front() != prefix || value[1] == '0') {
    return -1;
  }

  int parsed = 0;
  for (std::size_t index = 1; index < value.size(); ++index) {
    const char digit = value[index];
    if (digit < '0' || digit > '9') {
      return -1;
    }
    if (parsed > (std::numeric_limits<int>::max() - 9) / 10) {
      return -1;
    }
    parsed = (parsed * 10) + (digit - '0');
  }

  return parsed - 1;
}

int ResolveIndexedId(std::string_view id, char prefix, const std::vector<int>& index_by_numeric_id) {
  const int numeric_index = ParsePositivePrefixedId(id, prefix);
  if (numeric_index < 0 || numeric_index >= static_cast<int>(index_by_numeric_id.size())) {
    return -1;
  }
  return index_by_numeric_id[static_cast<std::size_t>(numeric_index)];
}

}  // namespace

NormalizedInstance NormalizeInput(const SolveInput& input) {
  if (input.max_days_per_medic < 0) {
    ThrowInvalidInput("maxDaysPerMedic cannot be negative.");
  }

  NormalizedInstance normalized;
  normalized.instance_id = input.instance_id;
  normalized.max_days_per_medic = input.max_days_per_medic;

  const auto sorted_periods =
      SortById(input.periods, [](const PeriodInput& item) -> const std::string& { return item.id; });
  const auto sorted_days = SortById(input.days, [](const DayInput& item) -> const std::string& { return item.id; });
  const auto sorted_medics =
      SortById(input.medics, [](const MedicInput& item) -> const std::string& { return item.id; });

  normalized.periods.reserve(sorted_periods.size());
  normalized.days.reserve(sorted_days.size());
  normalized.medics.reserve(sorted_medics.size());

  std::unordered_map<std::string_view, int> day_index_by_id;
  std::unordered_map<std::string_view, int> medic_index_by_id;
  std::unordered_set<std::string_view> seen_dates;
  day_index_by_id.reserve(sorted_days.size());
  medic_index_by_id.reserve(sorted_medics.size());
  seen_dates.reserve(sorted_days.size());
  std::vector<int> day_index_by_numeric_id(sorted_days.size(), -1);
  std::vector<int> medic_index_by_numeric_id(sorted_medics.size(), -1);

  for (std::size_t index = 0; index < sorted_periods.size(); ++index) {
    normalized.periods.push_back({sorted_periods[index]->id, {}});
  }

  for (std::size_t index = 0; index < sorted_days.size(); ++index) {
    if (!seen_dates.insert(std::string_view(sorted_days[index]->date)).second) {
      ThrowInvalidInput("Duplicate day date found while normalizing input: " + sorted_days[index]->date + ".");
    }
    day_index_by_id.emplace(std::string_view(sorted_days[index]->id), static_cast<int>(index));
    const int numeric_index = ParsePositivePrefixedId(sorted_days[index]->id, 'd');
    if (numeric_index >= 0 && numeric_index < static_cast<int>(day_index_by_numeric_id.size())) {
      day_index_by_numeric_id[static_cast<std::size_t>(numeric_index)] = static_cast<int>(index);
    }
    normalized.days.push_back({sorted_days[index]->id, sorted_days[index]->date, -1});
  }

  for (std::size_t index = 0; index < sorted_medics.size(); ++index) {
    medic_index_by_id.emplace(std::string_view(sorted_medics[index]->id), static_cast<int>(index));
    const int numeric_index = ParsePositivePrefixedId(sorted_medics[index]->id, 'm');
    if (numeric_index >= 0 && numeric_index < static_cast<int>(medic_index_by_numeric_id.size())) {
      medic_index_by_numeric_id[static_cast<std::size_t>(numeric_index)] = static_cast<int>(index);
    }
    normalized.medics.push_back({sorted_medics[index]->id, sorted_medics[index]->name});
  }

  for (std::size_t period_pointer_index = 0; period_pointer_index < sorted_periods.size(); ++period_pointer_index) {
    const PeriodInput* raw_period = sorted_periods[period_pointer_index];
    const int period_index = static_cast<int>(period_pointer_index);
    for (const std::string& day_id : raw_period->day_ids) {
      int day_index = ResolveIndexedId(day_id, 'd', day_index_by_numeric_id);
      if (day_index == -1) {
        const auto iterator = day_index_by_id.find(std::string_view(day_id));
        if (iterator == day_index_by_id.end()) {
          ThrowInvalidInput("Unknown day reference in periods: " + day_id + ".");
        }
        day_index = iterator->second;
      }
      if (normalized.days[day_index].period_index != -1) {
        ThrowInvalidInput("Each day must belong to exactly one period: " + day_id + ".");
      }
      normalized.days[day_index].period_index = period_index;
      normalized.periods[period_index].day_indices.push_back(day_index);
    }
  }

  for (NormalizedDay& day : normalized.days) {
    if (day.period_index == -1) {
      ThrowInvalidInput("Each day must belong to exactly one period: " + day.id + ".");
    }
  }

  for (NormalizedPeriod& period : normalized.periods) {
    std::sort(period.day_indices.begin(), period.day_indices.end());
  }

  normalized.availability_by_medic.assign(normalized.medics.size(), {});
  const std::size_t average_availability_per_medic =
      normalized.medics.empty() ? 0 : (input.availability.size() / normalized.medics.size()) + 1;
  for (std::vector<int>& medic_days : normalized.availability_by_medic) {
    medic_days.reserve(average_availability_per_medic);
  }
  std::vector<unsigned char> seen_availability(normalized.medics.size() * normalized.days.size(), 0);
  for (const AvailabilityInput& availability : input.availability) {
    int medic_index = ResolveIndexedId(availability.medic_id, 'm', medic_index_by_numeric_id);
    if (medic_index == -1) {
      const auto medic_iterator = medic_index_by_id.find(std::string_view(availability.medic_id));
      if (medic_iterator == medic_index_by_id.end()) {
        ThrowInvalidInput("Unknown medic reference in availability: " + availability.medic_id + ".");
      }
      medic_index = medic_iterator->second;
    }
    int day_index = ResolveIndexedId(availability.day_id, 'd', day_index_by_numeric_id);
    if (day_index == -1) {
      const auto day_iterator = day_index_by_id.find(std::string_view(availability.day_id));
      if (day_iterator == day_index_by_id.end()) {
        ThrowInvalidInput("Unknown day reference in availability: " + availability.day_id + ".");
      }
      day_index = day_iterator->second;
    }

    unsigned char& seen =
        seen_availability[(static_cast<std::size_t>(medic_index) * normalized.days.size()) +
                          static_cast<std::size_t>(day_index)];
    if (seen == 0) {
      seen = 1;
      normalized.availability_by_medic[static_cast<std::size_t>(medic_index)].push_back(day_index);
    }
  }

  for (std::vector<int>& medic_days : normalized.availability_by_medic) {
    std::sort(medic_days.begin(), medic_days.end());
  }

  return normalized;
}

}  // namespace engine
