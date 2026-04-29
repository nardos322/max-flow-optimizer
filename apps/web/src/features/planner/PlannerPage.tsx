import { getDraftIssue, getDraftIssues } from '../draft/index.js';
import { buildAssignmentRows } from './assignmentRows.js';
import { buildCsvContent } from './exportResult.js';
import { useAppState } from '../../state/appState.js';
import { Badge, PageSection } from '../../shared/ui/index.js';
import { AssignmentResultPanel } from './components/AssignmentResultPanel.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { InputSummaryPanel } from './components/InputSummaryPanel.js';
import { MetricsPanel } from './components/MetricsPanel.js';
import { SolveActionsPanel } from './components/SolveActionsPanel.js';
import { useSolveDraft } from './hooks/useSolveDraft.js';

export type DraftIssue = ReturnType<typeof getDraftIssue>;

export function PlannerPage() {
  const state = useAppState();
  const { runSolve } = useSolveDraft();
  const draftIssue = getDraftIssue(state.instanceDraft);
  const draftIssues = getDraftIssues(state.instanceDraft);
  const assignmentRows = buildAssignmentRows(state.instanceDraft, state.lastSolveResult);
  const csvContent = buildCsvContent(state.instanceDraft, state.lastSolveResult);

  return (
    <PageSection
      title="Planificador"
      description="Revisa el borrador actual, ejecuta la resolucion y exporta el resultado."
      actions={
        <Badge tone={state.lastSolveError ? 'error' : state.lastSolveResult?.feasible ? 'feasible' : state.lastSolveResult ? 'infeasible' : 'draft'}>
          {state.lastSolveError
            ? 'Error'
            : state.lastSolveResult?.feasible
              ? 'Feasible'
              : state.lastSolveResult
                ? 'Infeasible'
                : 'Draft'}
        </Badge>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <InputSummaryPanel instanceDraft={state.instanceDraft} draftIssue={draftIssue} draftIssues={draftIssues} />
        <SolveActionsPanel
          draftIssue={draftIssue}
          isSolving={state.isSolving}
          lastSolveError={state.lastSolveError}
          lastSolveResult={state.lastSolveResult}
          onRunSolve={runSolve}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AssignmentResultPanel
          assignmentRows={assignmentRows}
          csvContent={csvContent}
          lastSolveResult={state.lastSolveResult}
        />

        <div className="space-y-5">
          <MetricsPanel lastSolveResult={state.lastSolveResult} />
          <DiagnosticsPanel lastSolveResult={state.lastSolveResult} />
        </div>
      </div>
    </PageSection>
  );
}
