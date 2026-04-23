import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DaySchema } from '@maxflow/contracts/v1/schemas';

import { getPeriodIdForDay } from '../lib/planner.js';
import { useAppDispatch, useAppState } from '../state/appState.js';
import { EmptyState, Field, PageSection, Panel, PrimaryButton, SelectInput, TextInput } from './ui.js';

const dayFormSchema = DaySchema.extend({
  periodId: z.string().min(1, 'Select a period.')
});

type PeriodFormValues = {
  id: string;
};
type DayFormValues = z.infer<typeof dayFormSchema>;

export function PeriodsPage() {
  const { instanceDraft } = useAppState();
  const dispatch = useAppDispatch();
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);

  const editingPeriod = useMemo(
    () => instanceDraft.periods.find((period) => period.id === editingPeriodId) ?? null,
    [editingPeriodId, instanceDraft.periods]
  );
  const editingDay = useMemo(
    () => instanceDraft.days.find((day) => day.id === editingDayId) ?? null,
    [editingDayId, instanceDraft.days]
  );
  const assignableDays = useMemo(() => {
    return instanceDraft.days.filter((day) => {
      const assignedPeriodId = getPeriodIdForDay(instanceDraft.periods, day.id);
      return assignedPeriodId === null || assignedPeriodId === editingPeriodId;
    });
  }, [editingPeriodId, instanceDraft.days, instanceDraft.periods]);

  const periodForm = useForm<PeriodFormValues>({
    defaultValues: {
      id: ''
    }
  });

  const dayForm = useForm<DayFormValues>({
    resolver: zodResolver(dayFormSchema),
    defaultValues: {
      id: '',
      date: '',
      periodId: instanceDraft.periods[0]?.id ?? ''
    }
  });

  useEffect(() => {
    if (!editingPeriod) {
      periodForm.reset({ id: '' });
      setSelectedDayIds([]);
      return;
    }

    periodForm.reset({
      id: editingPeriod.id
    });
    setSelectedDayIds(editingPeriod.dayIds);
  }, [editingPeriod, periodForm]);

  useEffect(() => {
    if (!editingDay) {
      dayForm.reset({
        id: '',
        date: '',
        periodId: instanceDraft.periods[0]?.id ?? ''
      });
      return;
    }

    dayForm.reset({
      id: editingDay.id,
      date: editingDay.date,
      periodId: getPeriodIdForDay(instanceDraft.periods, editingDay.id) ?? ''
    });
  }, [dayForm, editingDay, instanceDraft.periods]);

  return (
    <PageSection
      title="Periodos"
      description="Define la estructura de periodos y asigna cada dia a un unico periodo."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          className="flex h-full flex-col"
          title={editingPeriod ? `Editar periodo ${editingPeriod.id}` : 'Nuevo periodo'}
          subtitle={
            editingPeriod
              ? 'Los dias pueden reasignarse desde aqui o desde el formulario de dias.'
              : 'Primero crea el periodo. Luego podras asignarle dias desde el formulario de dias.'
          }
          actions={
            editingPeriod ? (
              <PrimaryButton
                tone="neutral"
                type="button"
                onClick={() => {
                  setEditingPeriodId(null);
                  periodForm.reset({ id: '' });
                  setSelectedDayIds([]);
                }}
              >
                Cancelar
              </PrimaryButton>
            ) : null
          }
        >
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={periodForm.handleSubmit((values) => {
              dispatch({
                type: 'upsertPeriod',
                period: {
                  id: values.id,
                  dayIds: selectedDayIds
                }
              });
              setEditingPeriodId(null);
              periodForm.reset({ id: '' });
              setSelectedDayIds([]);
            })}
          >
            <Field label="Period ID" error={periodForm.formState.errors.id?.message}>
              <TextInput
                placeholder="p1"
                disabled={Boolean(editingPeriod)}
                {...periodForm.register('id', {
                  required: 'Period ID is required.',
                  validate: (value) => value.trim().length > 0 || 'Period ID is required.'
                })}
              />
            </Field>

            <div className="flex-1">
              {editingPeriod ? (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Dias asignados o disponibles para este periodo</span>
                  {instanceDraft.days.length === 0 ? (
                    <EmptyState title="Sin dias cargados" message="Crea el primer dia para poder asociarlo a un periodo." />
                  ) : assignableDays.length === 0 ? (
                    <EmptyState
                      title="Sin dias disponibles"
                      message="Todos los dias existentes ya estan asociados a otros periodos."
                    />
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assignableDays.map((day) => (
                        <label
                          key={day.id}
                          className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="block font-medium text-slate-900">{day.id}</span>
                            <span className="block text-slate-500">{day.date}</span>
                          </span>
                          <input
                            type="checkbox"
                            value={day.id}
                            checked={selectedDayIds.includes(day.id)}
                            onChange={(event) => {
                              const current = new Set(selectedDayIds);
                              if (event.target.checked) {
                                current.add(day.id);
                              } else {
                                current.delete(day.id);
                              }
                              setSelectedDayIds([...current]);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Asignacion de dias despues"
                  message="Crea el periodo primero. Luego asigna o mueve dias desde el formulario de dias."
                />
              )}
            </div>
            <PrimaryButton className="mt-auto self-start" type="submit">
              {editingPeriod ? 'Guardar periodo' : 'Crear periodo'}
            </PrimaryButton>
          </form>
        </Panel>

        <Panel
          className="flex h-full flex-col"
          title={editingDay ? `Editar dia ${editingDay.id}` : 'Nuevo dia'}
          subtitle="Cada dia debe terminar asociado a exactamente un periodo."
          actions={
            editingDay ? (
              <PrimaryButton
                tone="neutral"
                type="button"
                onClick={() => {
                  setEditingDayId(null);
                  dayForm.reset({ id: '', date: '', periodId: instanceDraft.periods[0]?.id ?? '' });
                }}
              >
                Cancelar
              </PrimaryButton>
            ) : null
          }
        >
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={dayForm.handleSubmit((values) => {
              dispatch({
                type: 'upsertDay',
                day: {
                  id: values.id,
                  date: values.date
                },
                periodId: values.periodId
              });
              setEditingDayId(null);
              dayForm.reset({ id: '', date: '', periodId: instanceDraft.periods[0]?.id ?? '' });
            })}
          >
            <Field label="Day ID" error={dayForm.formState.errors.id?.message}>
              <TextInput placeholder="d1" disabled={Boolean(editingDay)} {...dayForm.register('id')} />
            </Field>

            <Field label="Fecha" error={dayForm.formState.errors.date?.message}>
              <TextInput type="date" {...dayForm.register('date')} />
            </Field>

            <Field label="Periodo" error={dayForm.formState.errors.periodId?.message}>
              <SelectInput disabled={instanceDraft.periods.length === 0} {...dayForm.register('periodId')}>
                <option value="">Selecciona un periodo</option>
                {instanceDraft.periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.id}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <PrimaryButton className="mt-auto self-start" type="submit" disabled={instanceDraft.periods.length === 0}>
              {editingDay ? 'Guardar dia' : 'Crear dia'}
            </PrimaryButton>
          </form>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
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
                      <PrimaryButton tone="neutral" type="button" onClick={() => setEditingPeriodId(period.id)}>
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
                          <PrimaryButton tone="neutral" type="button" onClick={() => setEditingDayId(day.id)}>
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
      </div>
    </PageSection>
  );
}
