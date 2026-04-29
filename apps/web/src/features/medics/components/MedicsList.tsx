import type { Dispatch } from 'react';

import type { AppAction } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';
import { EmptyState } from '../../../shared/ui/index.js';
import { MedicAvailabilityCard } from './MedicAvailabilityCard.js';

export function MedicsList({
  availabilityByMedic,
  dispatch,
  instanceDraft,
  onEditMedic
}: {
  availabilityByMedic: Map<string, Set<string>>;
  dispatch: Dispatch<AppAction>;
  instanceDraft: InstanceDraft;
  onEditMedic: (medicId: string) => void;
}) {
  if (instanceDraft.medics.length === 0) {
    return <EmptyState title="Sin medicos" message="Crea el primer medico para cargar disponibilidad y resolver la instancia." />;
  }

  return (
    <div className="space-y-5">
      {instanceDraft.medics.map((medic) => (
        <MedicAvailabilityCard
          key={medic.id}
          dispatch={dispatch}
          instanceDraft={instanceDraft}
          medic={medic}
          selectedDays={availabilityByMedic.get(medic.id) ?? new Set<string>()}
          onEditMedic={onEditMedic}
        />
      ))}
    </div>
  );
}
