import type {
  OptimizationObjectiveV1,
  RunDetailV1,
  RunsListResponseV1,
  RunStatusV1,
  SolveResponseV1
} from '@maxflow/contracts/v1';

import type { ApiErrorDetails, AppSection, InstanceDraft } from '../types.js';

export type AppAction =
  | { type: 'setActiveSection'; section: AppSection }
  | { type: 'loadFixture'; variant?: 'feasible' | 'infeasible' }
  | { type: 'replaceDraft'; draft: InstanceDraft }
  | { type: 'setInstanceMeta'; patch: Pick<InstanceDraft, 'instanceId' | 'maxDaysPerMedic'> }
  | { type: 'upsertPeriod'; period: InstanceDraft['periods'][number] }
  | { type: 'deletePeriod'; periodId: string }
  | { type: 'upsertDay'; day: InstanceDraft['days'][number]; periodId: string | null }
  | { type: 'deleteDay'; dayId: string }
  | { type: 'upsertMedic'; medic: InstanceDraft['medics'][number] }
  | { type: 'deleteMedic'; medicId: string }
  | { type: 'toggleAvailability'; medicId: string; dayId: string }
  | { type: 'setOptimizationObjective'; objective: OptimizationObjectiveV1 }
  | { type: 'beginSolve' }
  | { type: 'solveSuccess'; result: SolveResponseV1 }
  | { type: 'solveError'; error: ApiErrorDetails }
  | { type: 'beginLoadRuns' }
  | { type: 'loadRunsSuccess'; result: RunsListResponseV1 }
  | { type: 'loadRunsError'; error: ApiErrorDetails }
  | { type: 'selectRun'; run: RunDetailV1 }
  | { type: 'clearSelectedRun' }
  | { type: 'setRunsFilterStatus'; status: RunStatusV1 | 'all' }
  | { type: 'setRunsOffset'; offset: number }
  | { type: 'restoreRunDraft'; run: RunDetailV1 };
