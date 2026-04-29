import type { SolveResponseV1 } from '@maxflow/contracts/v1';

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
  | { type: 'beginSolve' }
  | { type: 'solveSuccess'; result: SolveResponseV1 }
  | { type: 'solveError'; error: ApiErrorDetails };
