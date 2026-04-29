import { useRef, useState } from 'react';

import { createEmptyDraft, parseDraftFile } from '../lib/fixture.js';
import { useAppDispatch, useAppState } from '../state/appState.js';
import type { InstanceDraft } from '../types.js';
import { Badge, PrimaryButton } from '../shared/ui/index.js';

export function AppHeader() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const replaceDraft = (draft: InstanceDraft) => {
    dispatch({ type: 'replaceDraft', draft });
    setImportError(null);
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const draft = await parseDraftFile(file);
      replaceDraft(draft);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import the selected file.');
    }
  };

  return (
    <header className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Max Flow Optimizer</p>
          <h1 className="text-2xl font-semibold">Planificador de feriados</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="draft">{state.instanceDraft.instanceId || 'sin-instanceId'}</Badge>
          <PrimaryButton tone="neutral" type="button" onClick={() => replaceDraft(createEmptyDraft())}>
            Nuevo
          </PrimaryButton>
          <PrimaryButton
            tone="neutral"
            type="button"
            onClick={() => {
              dispatch({ type: 'loadFixture', variant: 'feasible' });
              setImportError(null);
            }}
          >
            Fixture OK
          </PrimaryButton>
          <PrimaryButton
            tone="neutral"
            type="button"
            onClick={() => {
              dispatch({ type: 'loadFixture', variant: 'infeasible' });
              setImportError(null);
            }}
          >
            Fixture KO
          </PrimaryButton>
          <PrimaryButton tone="neutral" type="button" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </PrimaryButton>
        </div>
      </div>
      {importError ? (
        <div className="mx-auto max-w-7xl px-4 pb-4 text-sm text-red-200 sm:px-6 lg:px-8">{importError}</div>
      ) : null}
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportChange} />
    </header>
  );
}
