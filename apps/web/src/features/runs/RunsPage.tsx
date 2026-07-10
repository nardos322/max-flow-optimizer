import { useCallback, useEffect } from 'react';

import type { ApiErrorCodeV1, RunStatusV1 } from '@maxflow/contracts/v1';

import { getRun, listRuns } from '../../lib/api.js';
import { downloadTextFile } from '../../shared/browser/index.js';
import { Badge, EmptyState, PageSection, Panel, PrimaryButton, SelectInput } from '../../shared/ui/index.js';
import { useAppDispatch, useAppState } from '../../state/appState.js';
import type { ApiErrorDetails } from '../../types.js';
import { buildRunCsvContent } from '../planner/exportResult.js';

const PAGE_SIZE = 20;

const statusOptions: { value: RunStatusV1 | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'feasible', label: 'Factibles' },
  { value: 'infeasible', label: 'Infactibles' },
  { value: 'error', label: 'Errores' }
];

export function RunsPage() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const loadRuns = useCallback(async () => {
    dispatch({ type: 'beginLoadRuns' });

    try {
      const result = await listRuns({
        limit: PAGE_SIZE,
        offset: state.runsOffset,
        status: state.runsFilterStatus
      });
      dispatch({ type: 'loadRunsSuccess', result });
    } catch (error) {
      dispatch({ type: 'loadRunsError', error: normalizeApiError(error) });
    }
  }, [dispatch, state.runsFilterStatus, state.runsOffset]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const items = state.runsList?.items ?? [];
  const total = state.runsList?.pagination.total ?? 0;
  const canGoPrevious = state.runsOffset > 0;
  const canGoNext = state.runsOffset + PAGE_SIZE < total;

  return (
    <PageSection
      title="Historial"
      description="Consulta corridas persistidas y restaura una entrada como borrador actual."
      actions={
        <PrimaryButton type="button" tone="neutral" disabled={state.isLoadingRuns} onClick={loadRuns}>
          Actualizar
        </PrimaryButton>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Corridas"
          subtitle="Ordenadas por fecha de creacion descendente."
          actions={
            <label className="min-w-44 text-sm text-slate-700">
              <span className="sr-only">Filtrar por estado</span>
              <SelectInput
                value={state.runsFilterStatus}
                onChange={(event) =>
                  dispatch({
                    type: 'setRunsFilterStatus',
                    status: event.target.value as RunStatusV1 | 'all'
                  })
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </label>
          }
        >
          <div className="space-y-4">
            {state.runsError ? <RunsError error={state.runsError} /> : null}

            {state.isLoadingRuns ? <p className="text-sm text-slate-600">Cargando historial...</p> : null}

            {!state.isLoadingRuns && items.length === 0 ? (
              <EmptyState title="Sin corridas" message="Cuando resuelvas una instancia con persistencia habilitada aparecera aqui." />
            ) : null}

            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-3 font-medium">createdAt</th>
                      <th className="pb-3 font-medium">instanceId</th>
                      <th className="pb-3 font-medium">status</th>
                      <th className="pb-3 font-medium">flow</th>
                      <th className="pb-3 font-medium">runtime</th>
                      <th className="pb-3 font-medium">accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((run) => (
                      <tr key={run.runId}>
                        <td className="py-3 text-slate-600">{formatDateTime(run.createdAt)}</td>
                        <td className="py-3 font-medium text-slate-900">{run.instanceId}</td>
                        <td className="py-3">
                          <Badge tone={badgeTone(run.status)}>{run.status}</Badge>
                        </td>
                        <td className="py-3 text-slate-600">
                          {run.maxFlow}/{run.requiredFlow}
                        </td>
                        <td className="py-3 text-slate-600">{run.runtimeMs} ms</td>
                        <td className="py-3">
                          <PrimaryButton
                            type="button"
                            tone="neutral"
                            onClick={async () => {
                              try {
                                const detail = await getRun(run.runId);
                                dispatch({ type: 'selectRun', run: detail });
                              } catch (error) {
                                dispatch({ type: 'loadRunsError', error: normalizeApiError(error) });
                              }
                            }}
                          >
                            Abrir
                          </PrimaryButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <span>
                {total} corridas
                {total > 0 ? ` | ${state.runsOffset + 1}-${Math.min(state.runsOffset + PAGE_SIZE, total)}` : ''}
              </span>
              <div className="flex gap-2">
                <PrimaryButton
                  type="button"
                  tone="neutral"
                  disabled={!canGoPrevious}
                  onClick={() => dispatch({ type: 'setRunsOffset', offset: state.runsOffset - PAGE_SIZE })}
                >
                  Anterior
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  tone="neutral"
                  disabled={!canGoNext}
                  onClick={() => dispatch({ type: 'setRunsOffset', offset: state.runsOffset + PAGE_SIZE })}
                >
                  Siguiente
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Panel>

        <RunDetailPanel />
      </div>
    </PageSection>
  );
}

function RunDetailPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const run = state.selectedRun;
  const csvContent = run ? buildRunCsvContent(run) : null;

  if (!run) {
    return (
      <Panel title="Detalle" subtitle="Selecciona una corrida para inspeccionar su input y response.">
        <EmptyState title="Sin seleccion" message="Abre una corrida del listado para ver sus datos completos." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Detalle"
      subtitle={`${run.instanceId} | ${formatDateTime(run.createdAt)}`}
      actions={<Badge tone={badgeTone(run.status)}>{run.status}</Badge>}
    >
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <DetailItem label="runId" value={run.runId} />
          <DetailItem label="maxDaysPerMedic" value={String(run.input.maxDaysPerMedic)} />
          <DetailItem label="days" value={String(run.input.days.length)} />
          <DetailItem label="medics" value={String(run.input.medics.length)} />
          <DetailItem label="requiredFlow" value={String(run.response.requiredFlow)} />
          <DetailItem label="maxFlow" value={String(run.response.maxFlow)} />
        </dl>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">response</p>
          <pre className="mt-2 max-h-72 overflow-auto text-xs text-slate-700">{JSON.stringify(run.response, null, 2)}</pre>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="button" onClick={() => dispatch({ type: 'restoreRunDraft', run })}>
            Usar como borrador
          </PrimaryButton>
          <PrimaryButton
            type="button"
            tone="neutral"
            onClick={() => downloadTextFile(`${run.instanceId}-${run.runId}.json`, JSON.stringify(run, null, 2), 'application/json')}
          >
            Export JSON
          </PrimaryButton>
          <PrimaryButton
            type="button"
            tone="neutral"
            disabled={!csvContent}
            onClick={() => {
              if (csvContent) {
                downloadTextFile(`${run.instanceId}-${run.runId}.csv`, csvContent, 'text/csv');
              }
            }}
          >
            Export CSV
          </PrimaryButton>
          <PrimaryButton type="button" tone="neutral" onClick={() => dispatch({ type: 'clearSelectedRun' })}>
            Cerrar
          </PrimaryButton>
        </div>
      </div>
    </Panel>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value}</dd>
    </div>
  );
}

function RunsError({ error }: { error: ApiErrorDetails }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-semibold">{error.code}</p>
      <p className="mt-1">{error.message}</p>
    </div>
  );
}

function badgeTone(status: RunStatusV1): 'feasible' | 'infeasible' | 'error' {
  if (status === 'feasible') {
    return 'feasible';
  }

  return status === 'infeasible' ? 'infeasible' : 'error';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (date.toString() === 'Invalid Date') {
    return value;
  }

  return date.toLocaleString();
}

function normalizeApiError(error: unknown): ApiErrorDetails {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'requestId' in error &&
    'timestamp' in error
  ) {
    return error as ApiErrorDetails;
  }

  return {
    requestId: 'client',
    timestamp: new Date().toISOString(),
    code: 'INTERNAL_ERROR' as ApiErrorCodeV1,
    message: 'Unexpected client error.'
  };
}
