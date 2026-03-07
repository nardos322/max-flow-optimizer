#ifndef ENGINE_SOLVER_HPP
#define ENGINE_SOLVER_HPP

#include "engine/contract.hpp"

namespace engine {

[[nodiscard]] SolveResponse SolveInstance(const SolveInput& input);

}  // namespace engine

#endif
