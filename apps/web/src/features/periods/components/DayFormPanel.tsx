import type { UseFormReturn } from 'react-hook-form';

import type { InstanceDraft } from '../../../types.js';
import { Field, Panel, PrimaryButton, SelectInput, TextInput } from '../../../shared/ui/index.js';
import type { DayFormValues } from '../types.js';

export function DayFormPanel({
  dayForm,
  editingDay,
  instanceDraft,
  onCancel,
  onSubmit
}: {
  dayForm: UseFormReturn<DayFormValues>;
  editingDay: InstanceDraft['days'][number] | null;
  instanceDraft: InstanceDraft;
  onCancel: () => void;
  onSubmit: (values: DayFormValues) => void;
}) {
  return (
    <Panel
      className="flex h-full flex-col"
      title={editingDay ? `Editar dia ${editingDay.id}` : 'Nuevo dia'}
      subtitle="Cada dia debe terminar asociado a exactamente un periodo."
      actions={
        editingDay ? (
          <PrimaryButton tone="neutral" type="button" onClick={onCancel}>
            Cancelar
          </PrimaryButton>
        ) : null
      }
    >
      <form className="flex flex-1 flex-col gap-4" onSubmit={dayForm.handleSubmit(onSubmit)}>
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
  );
}
