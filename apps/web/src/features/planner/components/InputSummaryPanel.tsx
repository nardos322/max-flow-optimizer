import type { ChangeEvent } from 'react';

import { describeIssue } from '../../draft/index.js';
import { useAppDispatch } from '../../../state/appState.js';
import type { InstanceDraft } from '../../../types.js';
import { Field, NumberInput, Panel, TextInput } from '../../../shared/ui/index.js';
import { SummaryStat } from './SummaryStat.js';
import type { DraftIssue } from '../PlannerPage.js';

export function InputSummaryPanel({
  instanceDraft,
  draftIssue,
  draftIssues
}: {
  instanceDraft: InstanceDraft;
  draftIssue: DraftIssue;
  draftIssues: DraftIssue[];
}) {
  const dispatch = useAppDispatch();

  return (
    <Panel title="Resumen de entrada" subtitle="El borrador se mantiene compartido entre las tres secciones.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Instance ID">
          <TextInput
            value={instanceDraft.instanceId}
            onChange={(event) =>
              dispatch({
                type: 'setInstanceMeta',
                patch: { instanceId: event.target.value, maxDaysPerMedic: instanceDraft.maxDaysPerMedic }
              })
            }
          />
        </Field>
        <Field label="Max dias por medico">
          <NumberInput
            min={0}
            value={instanceDraft.maxDaysPerMedic}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              dispatch({
                type: 'setInstanceMeta',
                patch: {
                  instanceId: instanceDraft.instanceId,
                  maxDaysPerMedic: Number(event.target.value || '0')
                }
              })
            }
          />
        </Field>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Periodos" value={instanceDraft.periods.length} />
        <SummaryStat label="Dias" value={instanceDraft.days.length} />
        <SummaryStat label="Medicos" value={instanceDraft.medics.length} />
        <SummaryStat label="Disponibilidad" value={instanceDraft.availability.length} />
      </div>

      <div
        className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
          draftIssue ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}
      >
        <p>{describeIssue(draftIssue)}</p>
        {draftIssues.length > 1 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            {draftIssues.slice(1, 4).map((issue, index) => (
              <li key={`${issue?.code ?? 'none'}-${issue?.path ?? 'root'}-${index}`}>
                {issue?.message}
                {issue?.path ? ` (${issue.path})` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
