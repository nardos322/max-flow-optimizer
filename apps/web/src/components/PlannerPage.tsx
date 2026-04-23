import type { ChangeEvent } from 'react';

import { buildAssignmentRows, buildCsvContent, describeIssue, downloadTextFile, getDraftIssue, getDraftIssues } from '../lib/planner.js';
import { solveDraft } from '../lib/api.js';
import { useAppDispatch, useAppState } from '../state/appState.js';
import type { ApiErrorDetails } from '../types.js';
import { Badge, EmptyState, Field, NumberInput, PageSection, Panel, PrimaryButton, TextInput } from './ui.js';

export function PlannerPage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const draftIssue = getDraftIssue(state.instanceDraft);
  const draftIssues = getDraftIssues(state.instanceDraft);
  const assignmentRows = buildAssignmentRows(state.instanceDraft, state.lastSolveResult);
  const csvContent = buildCsvContent(state.instanceDraft, state.lastSolveResult);

  const runSolve = async () => {
    dispatch({ type: 'beginSolve' });

    try {
      const result = await solveDraft(state.instanceDraft);
      dispatch({ type: 'solveSuccess', result });
    } catch (error) {
      dispatch({
        type: 'solveError',
        error: isApiErrorDetails(error)
          ? error
          : {
              requestId: 'client',
              timestamp: new Date().toISOString(),
              code: 'INTERNAL_ERROR',
              message: 'Unexpected client error.'
            }
      });
    }
  };

  return (
    <PageSection
      title="Planificador"
      description="Revisa el borrador actual, ejecuta la resolucion y exporta el resultado."
      actions={
        <Badge tone={state.lastSolveError ? 'error' : state.lastSolveResult?.feasible ? 'feasible' : state.lastSolveResult ? 'infeasible' : 'draft'}>
          {state.lastSolveError
            ? 'Error'
            : state.lastSolveResult?.feasible
              ? 'Feasible'
              : state.lastSolveResult
                ? 'Infeasible'
                : 'Draft'}
        </Badge>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Resumen de entrada" subtitle="El borrador se mantiene compartido entre las tres secciones.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instance ID">
              <TextInput
                value={state.instanceDraft.instanceId}
                onChange={(event) =>
                  dispatch({
                    type: 'setInstanceMeta',
                    patch: { instanceId: event.target.value, maxDaysPerMedic: state.instanceDraft.maxDaysPerMedic }
                  })
                }
              />
            </Field>
            <Field label="Max dias por medico">
              <NumberInput
                min={0}
                value={state.instanceDraft.maxDaysPerMedic}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  dispatch({
                    type: 'setInstanceMeta',
                    patch: {
                      instanceId: state.instanceDraft.instanceId,
                      maxDaysPerMedic: Number(event.target.value || '0')
                    }
                  })
                }
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryStat label="Periodos" value={state.instanceDraft.periods.length} />
            <SummaryStat label="Dias" value={state.instanceDraft.days.length} />
            <SummaryStat label="Medicos" value={state.instanceDraft.medics.length} />
            <SummaryStat label="Disponibilidad" value={state.instanceDraft.availability.length} />
          </div>

          <div className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            draftIssue ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            <p>{describeIssue(draftIssue)}</p>
            {draftIssues.length > 1 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
                {draftIssues.slice(1, 4).map((issue, index) => (
                  <li key={`${issue.code}-${issue.path ?? 'root'}-${index}`}>
                    {issue.message}
                    {issue.path ? ` (${issue.path})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Panel>

        <Panel title="Acciones" subtitle="La resolucion usa la API y el motor C++ sin recalcular nada en cliente.">
          <div className="space-y-4">
            <PrimaryButton type="button" disabled={Boolean(draftIssue) || state.isSolving} onClick={runSolve}>
              {state.isSolving ? 'Resolviendo...' : 'Resolver instancia'}
            </PrimaryButton>

            {state.lastSolveError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">{state.lastSolveError.code}</p>
                <p className="mt-1">{state.lastSolveError.message}</p>
                <p className="mt-1 text-xs">requestId: {state.lastSolveError.requestId}</p>
              </div>
            ) : null}

            {state.lastSolveResult ? (
              <div className={`rounded-lg border px-4 py-3 text-sm ${
                state.lastSolveResult.feasible
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                <p className="font-semibold">
                  {state.lastSolveResult.feasible ? 'Instancia factible.' : 'Instancia infactible.'}
                </p>
                <p className="mt-1">
                  maxFlow {state.lastSolveResult.maxFlow} / requiredFlow {state.lastSolveResult.requiredFlow}
                </p>
              </div>
            ) : (
              <EmptyState title="Sin corrida todavia" message="Cuando el borrador sea valido podras ejecutar la resolucion desde aqui." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Resultado" subtitle="La tabla solo aparece cuando la corrida es factible.">
          {!state.lastSolveResult ? (
            <EmptyState title="Sin resultado" message="Ejecuta una corrida para ver asignaciones, metricas y exportaciones." />
          ) : state.lastSolveResult.feasible ? (
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
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  tone="neutral"
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `${state.lastSolveResult?.instanceId ?? 'solve-result'}.json`,
                      JSON.stringify(state.lastSolveResult, null, 2),
                      'application/json'
                    )
                  }
                >
                  Export JSON
                </PrimaryButton>
                <PrimaryButton
                  tone="neutral"
                  type="button"
                  disabled={!csvContent}
                  onClick={() => {
                    if (csvContent) {
                      downloadTextFile(`${state.lastSolveResult?.instanceId ?? 'solve-result'}.csv`, csvContent, 'text/csv');
                    }
                  }}
                >
                  Export CSV
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <EmptyState title="Sin asignaciones" message="La respuesta fue infactible, por lo que no hay tabla ni exportacion CSV." />
              <PrimaryButton
                tone="neutral"
                type="button"
                onClick={() =>
                  downloadTextFile(
                    `${state.lastSolveResult?.instanceId ?? 'solve-result'}.json`,
                    JSON.stringify(state.lastSolveResult, null, 2),
                    'application/json'
                  )
                }
              >
                Export JSON
              </PrimaryButton>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Metricas" subtitle="Datos devueltos por el motor.">
            {state.lastSolveResult ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryStat label="requiredFlow" value={state.lastSolveResult.requiredFlow} />
                <SummaryStat label="maxFlow" value={state.lastSolveResult.maxFlow} />
                <SummaryStat label="nodes" value={state.lastSolveResult.stats.nodes} />
                <SummaryStat label="edges" value={state.lastSolveResult.stats.edges} />
                <SummaryStat label="runtimeMs" value={state.lastSolveResult.stats.runtimeMs} />
              </div>
            ) : (
              <EmptyState title="Sin metricas" message="Aparecen despues de la primera corrida." />
            )}
          </Panel>

          <Panel title="Diagnostico" subtitle="Solo aparece cuando la instancia es infactible.">
            {state.lastSolveResult && !state.lastSolveResult.feasible ? (
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <p className="font-medium text-slate-900">summaryCode</p>
                  <p>{state.lastSolveResult.diagnostics.summaryCode}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">message</p>
                  <p>{state.lastSolveResult.diagnostics.message}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">uncoveredDays</p>
                  <p>{state.lastSolveResult.diagnostics.uncoveredDays.join(', ') || 'Sin detalle'}</p>
                </div>
              </div>
            ) : (
              <EmptyState title="Sin diagnostico" message="El diagnostico queda reservado para respuestas infactibles." />
            )}
          </Panel>
        </div>
      </div>
    </PageSection>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function isApiErrorDetails(error: unknown): error is ApiErrorDetails {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'requestId' in error &&
    'timestamp' in error
  );
}
