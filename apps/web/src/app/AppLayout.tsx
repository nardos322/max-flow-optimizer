import { MedicsPage } from '../features/medics/index.js';
import { PeriodsPage } from '../features/periods/index.js';
import { PlannerPage } from '../features/planner/index.js';
import { useAppState } from '../state/appState.js';
import { AppHeader } from './AppHeader.js';
import { AppNav } from './AppNav.js';

export function AppLayout() {
  const state = useAppState();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AppHeader />
      <AppNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {state.activeSection === 'periods' ? <PeriodsPage /> : null}
        {state.activeSection === 'medics' ? <MedicsPage /> : null}
        {state.activeSection === 'planner' ? <PlannerPage /> : null}
      </main>
    </div>
  );
}
