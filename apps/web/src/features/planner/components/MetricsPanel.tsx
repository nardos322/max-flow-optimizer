import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import { EmptyState, Panel } from '../../../shared/ui/index.js';
import { SummaryStat } from './SummaryStat.js';

export function MetricsPanel({ lastSolveResult }: { lastSolveResult: SolveResponseV1 | null }) {
  return (
    <Panel title="Metricas" subtitle="Datos devueltos por el motor.">
      {lastSolveResult ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryStat label="requiredFlow" value={lastSolveResult.requiredFlow} />
          <SummaryStat label="maxFlow" value={lastSolveResult.maxFlow} />
          <SummaryStat label="nodes" value={lastSolveResult.stats.nodes} />
          <SummaryStat label="edges" value={lastSolveResult.stats.edges} />
          <SummaryStat label="runtimeMs" value={lastSolveResult.stats.runtimeMs} />
        </div>
      ) : (
        <EmptyState title="Sin metricas" message="Aparecen despues de la primera corrida." />
      )}
    </Panel>
  );
}
