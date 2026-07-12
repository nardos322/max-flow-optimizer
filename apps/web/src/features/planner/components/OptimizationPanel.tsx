import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import { EmptyState, Panel } from '../../../shared/ui/index.js';
import { SummaryStat } from './SummaryStat.js';

export function OptimizationPanel({ lastSolveResult }: { lastSolveResult: SolveResponseV1 | null }) {
  const optimization = lastSolveResult?.optimization;

  return (
    <Panel title="Equidad" subtitle="Distribucion de carga cuando se resuelve con optimizacion.">
      {optimization ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryStat label="score" value={optimization.score} />
            <SummaryStat label="spread" value={optimization.spread} />
            <SummaryStat label="maxAssignedDays" value={optimization.maxAssignedDays} />
            <SummaryStat label="minAssignedDays" value={optimization.minAssignedDays} />
            <SummaryStat label="totalCost" value={optimization.totalCost} />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">medicId</th>
                  <th className="pb-2 font-medium">nombre</th>
                  <th className="pb-2 font-medium">dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {optimization.loadByMedic.map((load) => (
                  <tr key={load.medicId}>
                    <td className="py-2 font-medium text-slate-900">{load.medicId}</td>
                    <td className="py-2 text-slate-600">{load.medicName}</td>
                    <td className="py-2 text-slate-600">{load.assignedDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Sin optimizacion" message="Selecciona Equidad y resuelve para ver distribucion por medico." />
      )}
    </Panel>
  );
}
