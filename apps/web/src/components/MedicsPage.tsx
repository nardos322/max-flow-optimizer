import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicSchema } from '@maxflow/contracts/v1/schemas';

import { getPeriodIdForDay } from '../lib/planner.js';
import { useAppDispatch, useAppState } from '../state/appState.js';
import { EmptyState, Field, PageSection, Panel, PrimaryButton, TextInput } from './ui.js';

type MedicFormValues = {
  id: string;
  name: string;
};

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
      <Panel
        title={editingMedic ? `Editar medico ${editingMedic.id}` : 'Nuevo medico'}
        subtitle="La disponibilidad se edita desde cada card."
        actions={
          editingMedic ? (
            <PrimaryButton
              tone="neutral"
              type="button"
              onClick={() => {
                setEditingMedicId(null);
                medicForm.reset({ id: '', name: '' });
              }}
            >
              Cancelar
            </PrimaryButton>
          ) : null
        }
      >
        <form
          className="grid gap-4 md:grid-cols-[1fr_1.2fr_auto]"
          onSubmit={medicForm.handleSubmit((values) => {
            dispatch({
              type: 'upsertMedic',
              medic: values
            });
            setEditingMedicId(null);
            medicForm.reset({ id: '', name: '' });
          })}
        >
          <Field label="Medic ID" error={medicForm.formState.errors.id?.message}>
            <TextInput placeholder="m1" disabled={Boolean(editingMedic)} {...medicForm.register('id')} />
          </Field>
          <Field label="Nombre" error={medicForm.formState.errors.name?.message}>
            <TextInput placeholder="Ana" {...medicForm.register('name')} />
          </Field>
          <div className="flex items-end">
            <PrimaryButton type="submit">{editingMedic ? 'Guardar medico' : 'Crear medico'}</PrimaryButton>
          </div>
        </form>
      </Panel>

      {instanceDraft.medics.length === 0 ? (
        <EmptyState title="Sin medicos" message="Crea el primer medico para cargar disponibilidad y resolver la instancia." />
      ) : (
        <div className="space-y-5">
          {instanceDraft.medics.map((medic) => {
            const selectedDays = availabilityByMedic.get(medic.id) ?? new Set<string>();
            const availabilityCount = instanceDraft.availability.filter((entry) => entry.medicId === medic.id).length;
            const activePeriods = new Set(
              instanceDraft.availability
                .filter((entry) => entry.medicId === medic.id)
                .map((entry) => getPeriodIdForDay(instanceDraft.periods, entry.dayId))
                .filter((value): value is string => Boolean(value))
            ).size;

            return (
              <Panel
                key={medic.id}
                title={`${medic.name} (${medic.id})`}
                subtitle={`${availabilityCount} dias disponibles en ${activePeriods} periodos`}
                actions={
                  <>
                    <PrimaryButton tone="neutral" type="button" onClick={() => setEditingMedicId(medic.id)}>
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
                                    onChange={() => dispatch({ type: 'toggleAvailability', medicId: medic.id, dayId })}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </PageSection>
  );
}
