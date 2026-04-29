import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import { downloadTextFile } from '../../../shared/browser/index.js';
import type { DayAssignmentRow } from '../../../types.js';
import { EmptyState, Panel, PrimaryButton } from '../../../shared/ui/index.js';

export function AssignmentResultPanel({
  assignmentRows,
  csvContent,
  lastSolveResult
}: {
  assignmentRows: DayAssignmentRow[];
  csvContent: string | null;
  lastSolveResult: SolveResponseV1 | null;
}) {
  return (
    <Panel title="Resultado" subtitle="La tabla solo aparece cuando la corrida es factible.">
      {!lastSolveResult ? (
        <EmptyState title="Sin resultado" message="Ejecuta una corrida para ver asignaciones, metricas y exportaciones." />
      ) : lastSolveResult.feasible ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">dayId</th>
                  <th className="pb-3 font-medium">date</th>
                  <th className="pb-3 font-medium">periodId</th>
                  <th className="pb-3 font-medium">medicId</th>
                  <th className="pb-3 font-medium">medicName</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignmentRows.map((row) => (
                  <tr key={row.dayId}>
                    <td className="py-3 font-medium text-slate-900">{row.dayId}</td>
                    <td className="py-3 text-slate-600">{row.date}</td>
                    <td className="py-3 text-slate-600">{row.periodId}</td>
                    <td className="py-3 text-slate-600">{row.medicId}</td>
                    <td className="py-3 text-slate-600">{row.medicName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ExportButtons csvContent={csvContent} lastSolveResult={lastSolveResult} />
        </div>
      ) : (
        <div className="space-y-4">
          <EmptyState title="Sin asignaciones" message="La respuesta fue infactible, por lo que no hay tabla ni exportacion CSV." />
          <ExportJsonButton lastSolveResult={lastSolveResult} />
        </div>
      )}
    </Panel>
  );
}

function ExportButtons({ csvContent, lastSolveResult }: { csvContent: string | null; lastSolveResult: SolveResponseV1 }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ExportJsonButton lastSolveResult={lastSolveResult} />
      <PrimaryButton
        tone="neutral"
        type="button"
        disabled={!csvContent}
        onClick={() => {
          if (csvContent) {
            downloadTextFile(`${lastSolveResult.instanceId ?? 'solve-result'}.csv`, csvContent, 'text/csv');
          }
        }}
      >
        Export CSV
      </PrimaryButton>
    </div>
  );
}

function ExportJsonButton({ lastSolveResult }: { lastSolveResult: SolveResponseV1 }) {
  return (
    <PrimaryButton
      tone="neutral"
      type="button"
      onClick={() =>
        downloadTextFile(
          `${lastSolveResult.instanceId ?? 'solve-result'}.json`,
          JSON.stringify(lastSolveResult, null, 2),
          'application/json'
        )
      }
    >
      Export JSON
    </PrimaryButton>
  );
}
