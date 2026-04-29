import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import type { ApiErrorDetails } from '../../../types.js';
import { EmptyState, Panel, PrimaryButton } from '../../../shared/ui/index.js';
import type { DraftIssue } from '../PlannerPage.js';

export function SolveActionsPanel({
  draftIssue,
  isSolving,
  lastSolveError,
  lastSolveResult,
  onRunSolve
}: {
  draftIssue: DraftIssue;
  isSolving: boolean;
  lastSolveError: ApiErrorDetails | null;
  lastSolveResult: SolveResponseV1 | null;
  onRunSolve: () => void;
}) {
  return (
    <Panel title="Acciones" subtitle="La resolucion usa la API y el motor C++ sin recalcular nada en cliente.">
      <div className="space-y-4">
        <PrimaryButton type="button" disabled={Boolean(draftIssue) || isSolving} onClick={onRunSolve}>
          {isSolving ? 'Resolviendo...' : 'Resolver instancia'}
        </PrimaryButton>

        {lastSolveError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">{lastSolveError.code}</p>
            <p className="mt-1">{lastSolveError.message}</p>
            <p className="mt-1 text-xs">requestId: {lastSolveError.requestId}</p>
          </div>
        ) : null}

        {lastSolveResult ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              lastSolveResult.feasible
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <p className="font-semibold">{lastSolveResult.feasible ? 'Instancia factible.' : 'Instancia infactible.'}</p>
            <p className="mt-1">
              maxFlow {lastSolveResult.maxFlow} / requiredFlow {lastSolveResult.requiredFlow}
            </p>
          </div>
        ) : (
          <EmptyState title="Sin corrida todavia" message="Cuando el borrador sea valido podras ejecutar la resolucion desde aqui." />
        )}
      </div>
    </Panel>
  );
}
