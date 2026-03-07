#ifndef ENGINE_NORMALIZED_INSTANCE_HPP
#define ENGINE_NORMALIZED_INSTANCE_HPP

#include <string>
#include <vector>

#include "engine/contract.hpp"

namespace engine {

struct NormalizedPeriod {
  std::string id;
  std::vector<int> day_indices;
};

struct NormalizedDay {
  std::string id;
  std::string date;
  int period_index = -1;
};

struct NormalizedMedic {
  std::string id;
  std::string name;
};

struct NormalizedInstance {
  std::string instance_id;
  int max_days_per_medic = 0;
  std::vector<NormalizedPeriod> periods;
  std::vector<NormalizedDay> days;
  std::vector<NormalizedMedic> medics;
  std::vector<std::vector<int>> availability_by_medic;
};

[[nodiscard]] NormalizedInstance NormalizeInput(const SolveInput& input);

}  // namespace engine

#endif
