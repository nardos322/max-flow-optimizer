import type { UseFormReturn } from 'react-hook-form';

import type { InstanceDraft } from '../../../types.js';
import { EmptyState, Field, Panel, PrimaryButton, TextInput } from '../../../shared/ui/index.js';
import type { PeriodFormValues } from '../types.js';

export function PeriodFormPanel({
  assignableDays,
  editingPeriod,
  instanceDraft,
  periodForm,
  selectedDayIds,
  onCancel,
  onSelectedDayIdsChange,
  onSubmit
}: {
  assignableDays: InstanceDraft['days'];
  editingPeriod: InstanceDraft['periods'][number] | null;
  instanceDraft: InstanceDraft;
  periodForm: UseFormReturn<PeriodFormValues>;
  selectedDayIds: string[];
  onCancel: () => void;
  onSelectedDayIdsChange: (dayIds: string[]) => void;
  onSubmit: (values: PeriodFormValues) => void;
}) {
  return (
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
          <PrimaryButton tone="neutral" type="button" onClick={onCancel}>
            Cancelar
          </PrimaryButton>
        ) : null
      }
    >
      <form className="flex flex-1 flex-col gap-4" onSubmit={periodForm.handleSubmit(onSubmit)}>
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
            <AssignableDays
              assignableDays={assignableDays}
              dayCount={instanceDraft.days.length}
              selectedDayIds={selectedDayIds}
              onSelectedDayIdsChange={onSelectedDayIdsChange}
            />
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
  );
}

function AssignableDays({
  assignableDays,
  dayCount,
  selectedDayIds,
  onSelectedDayIdsChange
}: {
  assignableDays: InstanceDraft['days'];
  dayCount: number;
  selectedDayIds: string[];
  onSelectedDayIdsChange: (dayIds: string[]) => void;
}) {
  if (dayCount === 0) {
    return <EmptyState title="Sin dias cargados" message="Crea el primer dia para poder asociarlo a un periodo." />;
  }

  if (assignableDays.length === 0) {
    return <EmptyState title="Sin dias disponibles" message="Todos los dias existentes ya estan asociados a otros periodos." />;
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">Dias asignados o disponibles para este periodo</span>
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
                onSelectedDayIdsChange([...current]);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
