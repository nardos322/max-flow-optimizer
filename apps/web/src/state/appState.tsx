import { createContext, useContext, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import type { SolveResponseV1 } from '@maxflow/contracts/v1';

import { createEmptyDraft, FIXTURE_DRAFT, INFEASIBLE_FIXTURE_DRAFT } from '../lib/fixture.js';
import { sortDraft } from '../lib/planner.js';
import type { ApiErrorDetails, AppSection, AppState, InstanceDraft } from '../types.js';

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

export const initialAppState: AppState = {
  activeSection: 'periods',
  instanceDraft: createEmptyDraft(),
  lastSolveResult: null,
  lastSolveError: null,
  isSolving: false
};

const StateContext = createContext<AppState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

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
      return resetSolveState(state, action.draft);
    case 'setInstanceMeta':
      return resetSolveState(state, {
        ...state.instanceDraft,
        ...action.patch
      });
    case 'upsertPeriod': {
      const periods = upsertById(state.instanceDraft.periods, action.period);
      return resetSolveState(state, {
        ...state.instanceDraft,
        periods
      });
    }
    case 'deletePeriod': {
      const periods = state.instanceDraft.periods.filter((period) => period.id !== action.periodId);
      return resetSolveState(state, {
        ...state.instanceDraft,
        periods
      });
    }
    case 'upsertDay': {
      const days = upsertById(state.instanceDraft.days, action.day);
      const periods = assignDayToPeriod(state.instanceDraft.periods, action.day.id, action.periodId);
      return resetSolveState(state, {
        ...state.instanceDraft,
        days,
        periods
      });
    }
    case 'deleteDay': {
      const days = state.instanceDraft.days.filter((day) => day.id !== action.dayId);
      const periods = state.instanceDraft.periods.map((period) => ({
        ...period,
        dayIds: period.dayIds.filter((dayId) => dayId !== action.dayId)
      }));
      const availability = state.instanceDraft.availability.filter((pair) => pair.dayId !== action.dayId);
      return resetSolveState(state, {
        ...state.instanceDraft,
        days,
        periods,
        availability
      });
    }
    case 'upsertMedic': {
      const medics = upsertById(state.instanceDraft.medics, action.medic);
      return resetSolveState(state, {
        ...state.instanceDraft,
        medics
      });
    }
    case 'deleteMedic': {
      const medics = state.instanceDraft.medics.filter((medic) => medic.id !== action.medicId);
      const availability = state.instanceDraft.availability.filter((pair) => pair.medicId !== action.medicId);
      return resetSolveState(state, {
        ...state.instanceDraft,
        medics,
        availability
      });
    }
    case 'toggleAvailability': {
      const pairExists = state.instanceDraft.availability.some(
        (pair) => pair.medicId === action.medicId && pair.dayId === action.dayId
      );
      const availability = pairExists
        ? state.instanceDraft.availability.filter(
            (pair) => !(pair.medicId === action.medicId && pair.dayId === action.dayId)
          )
        : [...state.instanceDraft.availability, { medicId: action.medicId, dayId: action.dayId }];

      return resetSolveState(state, {
        ...state.instanceDraft,
        availability
      });
    }
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

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);
  const memoizedState = useMemo(() => state, [state]);

  return (
    <StateContext.Provider value={memoizedState}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider.');
  }
  return context;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used inside AppStateProvider.');
  }
  return context;
}

function resetSolveState(state: AppState, instanceDraft: InstanceDraft): AppState {
  return {
    ...state,
    instanceDraft: sortDraft(instanceDraft),
    isSolving: false,
    lastSolveResult: null,
    lastSolveError: null
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [...items, item];
  }

  const nextItems = [...items];
  nextItems[index] = item;
  return nextItems;
}

function assignDayToPeriod(periods: InstanceDraft['periods'], dayId: string, periodId: string | null) {
  return periods.map((period) => {
    const dayIds = period.dayIds.filter((entry) => entry !== dayId);
    return period.id === periodId ? { ...period, dayIds: [...dayIds, dayId] } : { ...period, dayIds };
  });
}
