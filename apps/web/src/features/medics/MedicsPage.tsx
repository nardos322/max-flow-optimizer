import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicSchema } from '@maxflow/contracts/v1/schemas';

import { useAppDispatch, useAppState } from '../../state/appState.js';
import { PageSection } from '../../shared/ui/index.js';
import { MedicFormPanel } from './components/MedicFormPanel.js';
import { MedicsList } from './components/MedicsList.js';
import type { MedicFormValues } from './types.js';

export function MedicsPage() {
  const { instanceDraft } = useAppState();
  const dispatch = useAppDispatch();
  const [editingMedicId, setEditingMedicId] = useState<string | null>(null);

  const editingMedic = useMemo(
    () => instanceDraft.medics.find((medic) => medic.id === editingMedicId) ?? null,
    [editingMedicId, instanceDraft.medics]
  );

  const medicForm = useForm<MedicFormValues>({
    resolver: zodResolver(MedicSchema),
    defaultValues: {
      id: '',
      name: ''
    }
  });

  useEffect(() => {
    if (!editingMedic) {
      medicForm.reset({ id: '', name: '' });
      return;
    }

    medicForm.reset({
      id: editingMedic.id,
      name: editingMedic.name
    });
  }, [editingMedic, medicForm]);

  const availabilityByMedic = useMemo(() => {
    return new Map(
      instanceDraft.medics.map((medic) => [
        medic.id,
        new Set(instanceDraft.availability.filter((entry) => entry.medicId === medic.id).map((entry) => entry.dayId))
      ])
    );
  }, [instanceDraft.availability, instanceDraft.medics]);

  return (
    <PageSection
      title="Medicos"
      description="Gestiona el plantel y la disponibilidad diaria agrupada por periodo."
    >
      <MedicFormPanel
        editingMedic={editingMedic}
        medicForm={medicForm}
        onCancel={() => {
          setEditingMedicId(null);
          medicForm.reset({ id: '', name: '' });
        }}
        onSubmit={(values) => {
          dispatch({
            type: 'upsertMedic',
            medic: values
          });
          setEditingMedicId(null);
          medicForm.reset({ id: '', name: '' });
        }}
      />

      <MedicsList
        availabilityByMedic={availabilityByMedic}
        dispatch={dispatch}
        instanceDraft={instanceDraft}
        onEditMedic={setEditingMedicId}
      />
    </PageSection>
  );
}
