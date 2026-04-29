import type { UseFormReturn } from 'react-hook-form';

import type { InstanceDraft } from '../../../types.js';
import { Field, Panel, PrimaryButton, TextInput } from '../../../shared/ui/index.js';
import type { MedicFormValues } from '../types.js';

export function MedicFormPanel({
  editingMedic,
  medicForm,
  onCancel,
  onSubmit
}: {
  editingMedic: InstanceDraft['medics'][number] | null;
  medicForm: UseFormReturn<MedicFormValues>;
  onCancel: () => void;
  onSubmit: (values: MedicFormValues) => void;
}) {
  return (
    <Panel
      title={editingMedic ? `Editar medico ${editingMedic.id}` : 'Nuevo medico'}
      subtitle="La disponibilidad se edita desde cada card."
      actions={
        editingMedic ? (
          <PrimaryButton tone="neutral" type="button" onClick={onCancel}>
            Cancelar
          </PrimaryButton>
        ) : null
      }
    >
      <form className="grid gap-4 md:grid-cols-[1fr_1.2fr_auto]" onSubmit={medicForm.handleSubmit(onSubmit)}>
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
  );
}
