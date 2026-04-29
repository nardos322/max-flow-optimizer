import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import { EmptyState, Panel } from '../../../shared/ui/index.js';

export function DiagnosticsPanel({ lastSolveResult }: { lastSolveResult: SolveResponseV1 | null }) {
  return (
    <Panel title="Diagnostico" subtitle="Solo aparece cuando la instancia es infactible.">
      {lastSolveResult && !lastSolveResult.feasible ? (
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-medium text-slate-900">summaryCode</p>
            <p>{lastSolveResult.diagnostics.summaryCode}</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">message</p>
            <p>{lastSolveResult.diagnostics.message}</p>
          </div>
          <div>
            <p className="font-medium text-slate-900">uncoveredDays</p>
            <p>{lastSolveResult.diagnostics.uncoveredDays.join(', ') || 'Sin detalle'}</p>
          </div>
        </div>
      ) : (
        <EmptyState title="Sin diagnostico" message="El diagnostico queda reservado para respuestas infactibles." />
      )}
    </Panel>
  );
}
