import type { Dispatch } from 'react';

import type { AppAction } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';
import { EmptyState, Panel, PrimaryButton } from '../../../shared/ui/index.js';

export function PeriodsListPanel({
  dispatch,
  instanceDraft,
  onEditPeriod
}: {
  dispatch: Dispatch<AppAction>;
  instanceDraft: InstanceDraft;
  onEditPeriod: (periodId: string) => void;
}) {
  return (
    <Panel title="Periodos cargados" subtitle="Un periodo sin dias queda visible como incompleto.">
      {instanceDraft.periods.length === 0 ? (
        <EmptyState title="Sin periodos" message="Crea el primer periodo para empezar a estructurar la instancia." />
      ) : (
        <div className="space-y-3">
          {instanceDraft.periods.map((period) => (
            <div key={period.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{period.id}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {period.dayIds.length > 0
                      ? period.dayIds
                          .map((dayId) => {
                            const day = instanceDraft.days.find((entry) => entry.id === dayId);
                            return `${dayId}${day ? ` (${day.date})` : ''}`;
                          })
                          .join(', ')
                      : 'Periodo incompleto: sin dias asociados.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <PrimaryButton tone="neutral" type="button" onClick={() => onEditPeriod(period.id)}>
                    Editar
                  </PrimaryButton>
                  <PrimaryButton
                    tone="danger"
                    type="button"
                    disabled={period.dayIds.length > 0}
                    title={period.dayIds.length > 0 ? 'Primero mueve o elimina los dias asociados.' : undefined}
                    onClick={() => dispatch({ type: 'deletePeriod', periodId: period.id })}
                  >
                    Eliminar
                  </PrimaryButton>
                </div>
              </div>
              {period.dayIds.length > 0 ? (
                <p className="mt-3 text-xs text-slate-500">Para eliminar este periodo primero debes dejarlo sin dias asociados.</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
