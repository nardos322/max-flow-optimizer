import { createContext, useContext, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';

import type { AppState } from '../types.js';
import type { AppAction } from './appActions.js';
import { appStateReducer, initialAppState } from './appReducer.js';

const StateContext = createContext<AppState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

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
