#ifndef ENGINE_EDMONDS_KARP_HPP
#define ENGINE_EDMONDS_KARP_HPP

#include "engine/graph.hpp"

namespace engine {

struct MaxFlowResult {
  int max_flow = 0;
  int augmenting_paths = 0;
};

[[nodiscard]] MaxFlowResult ComputeMaxFlow(Graph& graph, int source, int sink);

}  // namespace engine

#endif
