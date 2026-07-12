import type { OptimizationObjectiveV1, SolveResponseV1 } from '@maxflow/contracts/v1';

import type { ApiErrorDetails } from '../../../types.js';
import { EmptyState, Field, Panel, PrimaryButton, SelectInput } from '../../../shared/ui/index.js';
import type { DraftIssue } from '../PlannerPage.js';

export function SolveActionsPanel({
  draftIssue,
  isSolving,
  lastSolveError,
  lastSolveResult,
  optimizationObjective,
  onOptimizationObjectiveChange,
  onRunSolve
}: {
  draftIssue: DraftIssue;
  isSolving: boolean;
  lastSolveError: ApiErrorDetails | null;
  lastSolveResult: SolveResponseV1 | null;
  optimizationObjective: OptimizationObjectiveV1;
  onOptimizationObjectiveChange: (objective: OptimizationObjectiveV1) => void;
  onRunSolve: () => void;
}) {
  return (
    <Panel title="Acciones" subtitle="La resolucion usa la API y el motor C++ sin recalcular nada en cliente.">
      <div className="space-y-4">
        <Field label="Modo">
          <SelectInput
            value={optimizationObjective}
            onChange={(event) => onOptimizationObjectiveChange(event.target.value as OptimizationObjectiveV1)}
            disabled={isSolving}
          >
            <option value="none">Factibilidad</option>
            <option value="fairness">Equidad</option>
          </SelectInput>
        </Field>

        <PrimaryButton type="button" disabled={Boolean(draftIssue) || isSolving} onClick={onRunSolve}>
          {isSolving ? 'Resolviendo...' : optimizationObjective === 'fairness' ? 'Resolver con equidad' : 'Resolver instancia'}
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
            <p className="font-semibold">
              {lastSolveResult.feasible ? 'Se encontro una asignacion factible.' : 'No se encontro una asignacion factible.'}
            </p>
            <p className="mt-1">
              maxFlow {lastSolveResult.maxFlow} / requiredFlow {lastSolveResult.requiredFlow}
            </p>
            {lastSolveResult.optimization ? (
              <p className="mt-1 text-xs">objective: {lastSolveResult.optimization.objective}</p>
            ) : null}
            {lastSolveResult.runId ? <p className="mt-1 text-xs">runId: {lastSolveResult.runId}</p> : null}
            {lastSolveResult.createdAt ? <p className="mt-1 text-xs">createdAt: {lastSolveResult.createdAt}</p> : null}
          </div>
        ) : (
          <EmptyState title="Sin corrida todavia" message="Cuando el borrador sea valido podras ejecutar la resolucion desde aqui." />
        )}
      </div>
    </Panel>
  );
}
