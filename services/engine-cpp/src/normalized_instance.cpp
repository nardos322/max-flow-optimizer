#include "engine/normalized_instance.hpp"

#include <algorithm>
#include <set>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
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

  std::unordered_map<std::string, int> period_index_by_id;
  std::unordered_map<std::string, int> day_index_by_id;
  std::unordered_map<std::string, int> medic_index_by_id;
  std::unordered_set<std::string> seen_dates;

  for (std::size_t index = 0; index < sorted_periods.size(); ++index) {
    period_index_by_id.emplace(sorted_periods[index]->id, static_cast<int>(index));
    normalized.periods.push_back({sorted_periods[index]->id, {}});
  }

  for (std::size_t index = 0; index < sorted_days.size(); ++index) {
    if (!seen_dates.insert(sorted_days[index]->date).second) {
      ThrowInvalidInput("Duplicate day date found while normalizing input: " + sorted_days[index]->date + ".");
    }
    day_index_by_id.emplace(sorted_days[index]->id, static_cast<int>(index));
    normalized.days.push_back({sorted_days[index]->id, sorted_days[index]->date, -1});
  }

  for (std::size_t index = 0; index < sorted_medics.size(); ++index) {
    medic_index_by_id.emplace(sorted_medics[index]->id, static_cast<int>(index));
    normalized.medics.push_back({sorted_medics[index]->id, sorted_medics[index]->name});
  }

  for (const PeriodInput* raw_period : sorted_periods) {
    const int period_index = period_index_by_id.at(raw_period->id);
    for (const std::string& day_id : raw_period->day_ids) {
      const auto iterator = day_index_by_id.find(day_id);
      if (iterator == day_index_by_id.end()) {
        ThrowInvalidInput("Unknown day reference in periods: " + day_id + ".");
      }
      const int day_index = iterator->second;
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
  std::set<std::pair<int, int>> unique_pairs;
  for (const AvailabilityInput& availability : input.availability) {
    const auto medic_iterator = medic_index_by_id.find(availability.medic_id);
    if (medic_iterator == medic_index_by_id.end()) {
      ThrowInvalidInput("Unknown medic reference in availability: " + availability.medic_id + ".");
    }
    const auto day_iterator = day_index_by_id.find(availability.day_id);
    if (day_iterator == day_index_by_id.end()) {
      ThrowInvalidInput("Unknown day reference in availability: " + availability.day_id + ".");
    }

    const std::pair<int, int> pair{medic_iterator->second, day_iterator->second};
    if (unique_pairs.insert(pair).second) {
      normalized.availability_by_medic[pair.first].push_back(pair.second);
    }
  }

  for (std::vector<int>& medic_days : normalized.availability_by_medic) {
    std::sort(medic_days.begin(), medic_days.end());
  }

  return normalized;
}

}  // namespace engine
