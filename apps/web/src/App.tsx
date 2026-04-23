import { useRef, useState } from 'react';

import { parseDraftFile } from './lib/fixture.js';
import { AppStateProvider, useAppDispatch, useAppState } from './state/appState.js';
import { MedicsPage } from './components/MedicsPage.js';
import { PlannerPage } from './components/PlannerPage.js';
import { PeriodsPage } from './components/PeriodsPage.js';
import { Badge, PrimaryButton } from './components/ui.js';
import type { AppSection } from './types.js';

const sections: { id: AppSection; label: string }[] = [
  { id: 'periods', label: 'Periodos' },
  { id: 'medics', label: 'Medicos' },
  { id: 'planner', label: 'Planificador' }
];

function AppLayout() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const draft = await parseDraftFile(file);
      dispatch({ type: 'replaceDraft', draft });
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unable to import the selected file.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Max Flow Optimizer</p>
            <h1 className="text-2xl font-semibold">Planificador de feriados</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="draft">{state.instanceDraft.instanceId || 'sin-instanceId'}</Badge>
            <PrimaryButton tone="neutral" type="button" onClick={() => dispatch({ type: 'replaceDraft', draft: { instanceId: 'draft-001', maxDaysPerMedic: 1, periods: [], days: [], medics: [], availability: [] } })}>
              Nuevo
            </PrimaryButton>
            <PrimaryButton tone="neutral" type="button" onClick={() => dispatch({ type: 'loadFixture', variant: 'feasible' })}>
              Fixture OK
            </PrimaryButton>
            <PrimaryButton tone="neutral" type="button" onClick={() => dispatch({ type: 'loadFixture', variant: 'infeasible' })}>
              Fixture KO
            </PrimaryButton>
            <PrimaryButton tone="neutral" type="button" onClick={handleImportClick}>
              Import JSON
            </PrimaryButton>
          </div>
        </div>
        {importError ? (
          <div className="mx-auto max-w-7xl px-4 pb-4 text-sm text-red-200 sm:px-6 lg:px-8">{importError}</div>
        ) : null}
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportChange} />
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto py-3">
            {sections.map((section) => {
              const isActive = state.activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition ${
                    isActive ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  onClick={() => dispatch({ type: 'setActiveSection', section: section.id })}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {state.activeSection === 'periods' ? <PeriodsPage /> : null}
        {state.activeSection === 'medics' ? <MedicsPage /> : null}
        {state.activeSection === 'planner' ? <PlannerPage /> : null}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppLayout />
    </AppStateProvider>
  );
}
