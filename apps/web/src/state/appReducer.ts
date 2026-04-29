import { createEmptyDraft, FIXTURE_DRAFT, INFEASIBLE_FIXTURE_DRAFT } from '../lib/fixture.js';
import { sortDraft } from '../features/draft/index.js';
import type { AppState, InstanceDraft } from '../types.js';
import type { AppAction } from './appActions.js';
import {
  deleteDay,
  deleteMedic,
  deletePeriod,
  replaceDraft,
  setInstanceMeta,
  toggleAvailability,
  upsertDay,
  upsertMedic,
  upsertPeriod
} from './draftMutations.js';

export const initialAppState: AppState = {
  activeSection: 'periods',
  instanceDraft: createEmptyDraft(),
  lastSolveResult: null,
  lastSolveError: null,
  isSolving: false
};

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setActiveSection':
      return {
        ...state,
        activeSection: action.section
      };
    case 'loadFixture':
      return resetSolveState(state, action.variant === 'infeasible' ? INFEASIBLE_FIXTURE_DRAFT : FIXTURE_DRAFT);
    case 'replaceDraft':
      return resetSolveState(state, replaceDraft(action.draft));
    case 'setInstanceMeta':
      return resetSolveState(state, setInstanceMeta(state.instanceDraft, action.patch));
    case 'upsertPeriod':
      return resetSolveState(state, upsertPeriod(state.instanceDraft, action.period));
    case 'deletePeriod':
      return resetSolveState(state, deletePeriod(state.instanceDraft, action.periodId));
    case 'upsertDay':
      return resetSolveState(state, upsertDay(state.instanceDraft, action.day, action.periodId));
    case 'deleteDay':
      return resetSolveState(state, deleteDay(state.instanceDraft, action.dayId));
    case 'upsertMedic':
      return resetSolveState(state, upsertMedic(state.instanceDraft, action.medic));
    case 'deleteMedic':
      return resetSolveState(state, deleteMedic(state.instanceDraft, action.medicId));
    case 'toggleAvailability':
      return resetSolveState(state, toggleAvailability(state.instanceDraft, action.medicId, action.dayId));
    case 'beginSolve':
      return {
        ...state,
        isSolving: true,
        lastSolveError: null
      };
    case 'solveSuccess':
      return {
        ...state,
        isSolving: false,
        lastSolveResult: action.result,
        lastSolveError: null,
        instanceDraft: sortDraft(state.instanceDraft)
      };
    case 'solveError':
      return {
        ...state,
        isSolving: false,
        lastSolveError: action.error
      };
    default:
      return state;
  }
}

function resetSolveState(state: AppState, instanceDraft: InstanceDraft): AppState {
  return {
    ...state,
    instanceDraft,
    isSolving: false,
    lastSolveResult: null,
    lastSolveError: null
  };
}
