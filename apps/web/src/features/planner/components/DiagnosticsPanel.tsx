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
          {lastSolveResult.diagnostics.capacity ? (
            <div>
              <p className="font-medium text-slate-900">capacity</p>
              <p>
                requiredDays {lastSolveResult.diagnostics.capacity.requiredDays} | totalMedicCapacity{' '}
                {lastSolveResult.diagnostics.capacity.totalMedicCapacity} | availablePairs{' '}
                {lastSolveResult.diagnostics.capacity.availablePairs}
              </p>
            </div>
          ) : null}
          {lastSolveResult.diagnostics.daysWithoutAvailability?.length ? (
            <div>
              <p className="font-medium text-slate-900">daysWithoutAvailability</p>
              <p>{lastSolveResult.diagnostics.daysWithoutAvailability.join(', ')}</p>
            </div>
          ) : null}
          {lastSolveResult.diagnostics.periods?.length ? (
            <div>
              <p className="font-medium text-slate-900">periods</p>
              <div className="mt-2 space-y-2">
                {lastSolveResult.diagnostics.periods.map((period) => (
                  <div key={period.periodId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{period.periodId}</p>
                    <p>
                      requiredDays {period.requiredDays} | maxCoverableDays {period.maxCoverableDays}
                    </p>
                    <p>uncoveredDays {period.uncoveredDays.join(', ') || 'Sin detalle'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {lastSolveResult.diagnostics.medics?.length ? (
            <div>
              <p className="font-medium text-slate-900">medics</p>
              <p>
                {lastSolveResult.diagnostics.medics
                  .map((medic) => `${medic.medicId} (${medic.availableDays}/${medic.maxDaysPerMedic})`)
                  .join(', ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState title="Sin diagnostico" message="El diagnostico queda reservado para respuestas infactibles." />
      )}
    </Panel>
  );
}
