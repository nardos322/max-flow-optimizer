import type { Dispatch } from 'react';

import { getPeriodIdForDay } from '../../draft/index.js';
import type { AppAction } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';
import { EmptyState, Panel, PrimaryButton } from '../../../shared/ui/index.js';
import { AvailabilityByPeriod } from './AvailabilityByPeriod.js';

export function MedicAvailabilityCard({
  dispatch,
  instanceDraft,
  medic,
  selectedDays,
  onEditMedic
}: {
  dispatch: Dispatch<AppAction>;
  instanceDraft: InstanceDraft;
  medic: InstanceDraft['medics'][number];
  selectedDays: Set<string>;
  onEditMedic: (medicId: string) => void;
}) {
  const availabilityCount = instanceDraft.availability.filter((entry) => entry.medicId === medic.id).length;
  const activePeriods = new Set(
    instanceDraft.availability
      .filter((entry) => entry.medicId === medic.id)
      .map((entry) => getPeriodIdForDay(instanceDraft.periods, entry.dayId))
      .filter((value): value is string => Boolean(value))
  ).size;

  return (
    <Panel
      title={`${medic.name} (${medic.id})`}
      subtitle={`${availabilityCount} dias disponibles en ${activePeriods} periodos`}
      actions={
        <>
          <PrimaryButton tone="neutral" type="button" onClick={() => onEditMedic(medic.id)}>
            Editar
          </PrimaryButton>
          <PrimaryButton tone="danger" type="button" onClick={() => dispatch({ type: 'deleteMedic', medicId: medic.id })}>
            Eliminar
          </PrimaryButton>
        </>
      }
    >
      {instanceDraft.days.length === 0 || instanceDraft.periods.length === 0 ? (
        <EmptyState
          title="Disponibilidad no editable todavia"
          message="Carga periodos y dias antes de marcar disponibilidad por medico."
        />
      ) : (
        <AvailabilityByPeriod
          dispatch={dispatch}
          instanceDraft={instanceDraft}
          medicId={medic.id}
          selectedDays={selectedDays}
        />
      )}
    </Panel>
  );
}
