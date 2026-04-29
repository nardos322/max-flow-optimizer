import { solveDraft } from '../../../lib/api.js';
import { useAppDispatch, useAppState } from '../../../state/appState.js';
import type { ApiErrorDetails } from '../../../types.js';

export function useSolveDraft() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const runSolve = async () => {
    dispatch({ type: 'beginSolve' });

    try {
      const result = await solveDraft(state.instanceDraft);
      dispatch({ type: 'solveSuccess', result });
    } catch (error) {
      dispatch({
        type: 'solveError',
        error: isApiErrorDetails(error)
          ? error
          : {
              requestId: 'client',
              timestamp: new Date().toISOString(),
              code: 'INTERNAL_ERROR',
              message: 'Unexpected client error.'
            }
      });
    }
  };

  return { runSolve };
}

function isApiErrorDetails(error: unknown): error is ApiErrorDetails {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'requestId' in error &&
    'timestamp' in error
  );
}
