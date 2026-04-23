import type { ApiErrorV1, SolveRequestV1, SolveResponseV1 } from '@maxflow/contracts/v1';

export type AppSection = 'periods' | 'medics' | 'planner';

export type InstanceDraft = SolveRequestV1;

export type ApiErrorDetails = ApiErrorV1['error'];

export type AppState = {
  activeSection: AppSection;
  instanceDraft: InstanceDraft;
  lastSolveResult: SolveResponseV1 | null;
  lastSolveError: ApiErrorDetails | null;
  isSolving: boolean;
};

export type DayAssignmentRow = {
  dayId: string;
  date: string;
  periodId: string;
  medicId: string;
  medicName: string;
};
