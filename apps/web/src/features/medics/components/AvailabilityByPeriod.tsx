import type { Dispatch } from 'react';

import type { AppAction } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';

export function AvailabilityByPeriod({
  dispatch,
  instanceDraft,
  medicId,
  selectedDays
}: {
  dispatch: Dispatch<AppAction>;
  instanceDraft: InstanceDraft;
  medicId: string;
  selectedDays: Set<string>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {instanceDraft.periods.map((period) => (
        <div key={period.id} className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{period.id}</p>
            <p className="text-xs text-slate-500">{period.dayIds.length} dias</p>
          </div>
          {period.dayIds.length === 0 ? (
            <p className="text-sm text-slate-500">Periodo incompleto: sin dias asignados.</p>
          ) : (
            <div className="space-y-2">
              {period.dayIds.map((dayId) => {
                const day = instanceDraft.days.find((entry) => entry.id === dayId);
                return (
                  <label
                    key={dayId}
                    className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="block font-medium text-slate-900">{dayId}</span>
                      <span className="block text-slate-500">{day?.date ?? 'Sin fecha'}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedDays.has(dayId)}
                      onChange={() => dispatch({ type: 'toggleAvailability', medicId, dayId })}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
