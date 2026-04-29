import { sections } from './sections.js';
import { useAppDispatch, useAppState } from '../state/appState.js';

export function AppNav() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  return (
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
  );
}
