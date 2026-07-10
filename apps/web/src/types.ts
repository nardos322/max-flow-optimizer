import type {
  ApiErrorV1,
  RunDetailV1,
  RunsListResponseV1,
  RunStatusV1,
  SolveRequestV1,
  SolveResponseV1
} from '@maxflow/contracts/v1';

export type AppSection = 'periods' | 'medics' | 'planner' | 'runs';

export type InstanceDraft = SolveRequestV1;

export type ApiErrorDetails = ApiErrorV1['error'];

export type AppState = {
  activeSection: AppSection;
  instanceDraft: InstanceDraft;
  lastSolveResult: SolveResponseV1 | null;
  lastSolveError: ApiErrorDetails | null;
  isSolving: boolean;
  runsList: RunsListResponseV1 | null;
  selectedRun: RunDetailV1 | null;
  isLoadingRuns: boolean;
  runsError: ApiErrorDetails | null;
  runsFilterStatus: RunStatusV1 | 'all';
  runsOffset: number;
};

export type DayAssignmentRow = {
  dayId: string;
  date: string;
  periodId: string;
  medicId: string;
  medicName: string;
};
