import type { Dispatch } from 'react';

import { getPeriodIdForDay } from '../../draft/index.js';
import type { AppAction } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';
import { EmptyState, Panel, PrimaryButton } from '../../../shared/ui/index.js';

export function DaysListPanel({
  dispatch,
  instanceDraft,
  onEditDay
}: {
  dispatch: Dispatch<AppAction>;
  instanceDraft: InstanceDraft;
  onEditDay: (dayId: string) => void;
}) {
  return (
    <Panel title="Dias cargados" subtitle="Cada fila muestra la fecha y el periodo al que pertenece.">
      {instanceDraft.days.length === 0 ? (
        <EmptyState title="Sin dias" message="Agrega dias para habilitar disponibilidad y planificacion." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 font-medium">Day ID</th>
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Periodo</th>
                <th className="pb-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {instanceDraft.days.map((day) => (
                <tr key={day.id}>
                  <td className="py-3 font-medium text-slate-900">{day.id}</td>
                  <td className="py-3 text-slate-600">{day.date}</td>
                  <td className="py-3 text-slate-600">{getPeriodIdForDay(instanceDraft.periods, day.id) ?? 'Sin periodo'}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <PrimaryButton tone="neutral" type="button" onClick={() => onEditDay(day.id)}>
                        Editar
                      </PrimaryButton>
                      <PrimaryButton tone="danger" type="button" onClick={() => dispatch({ type: 'deleteDay', dayId: day.id })}>
                        Eliminar
                      </PrimaryButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
