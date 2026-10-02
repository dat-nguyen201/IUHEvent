import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useReducer } from 'react';

type User = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  major: string;
};

type AppState = {
  user: User | null;
  savedEventIds: string[];
  checkedInEventIds: string[];
};

type AppAction =
  | { type: 'set-user'; user: User | null }
  | { type: 'save-event'; eventId: string }
  | { type: 'unsave-event'; eventId: string }
  | { type: 'check-in-event'; eventId: string };

type AppStateContextValue = AppState & {
  saveEvent: (eventId: string) => void;
  unsaveEvent: (eventId: string) => void;
  checkInEvent: (eventId: string) => void;
  setUser: (user: User | null) => void;
  isEventSaved: (eventId: string) => boolean;
};

const initialState: AppState = {
  user: null,
  savedEventIds: [],
  checkedInEventIds: [],
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'set-user':
      return { ...state, user: action.user };
    case 'save-event':
      if (state.savedEventIds.includes(action.eventId)) {
        return state;
      }
      return { ...state, savedEventIds: [...state.savedEventIds, action.eventId] };
    case 'unsave-event':
      return {
        ...state,
        savedEventIds: state.savedEventIds.filter((eventId) => eventId !== action.eventId),
      };
    case 'check-in-event':
      if (state.checkedInEventIds.includes(action.eventId)) {
        return state;
      }
      return { ...state, checkedInEventIds: [...state.checkedInEventIds, action.eventId] };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  const saveEvent = useCallback((eventId: string) => {
    dispatch({ type: 'save-event', eventId });
  }, []);

  const unsaveEvent = useCallback((eventId: string) => {
    dispatch({ type: 'unsave-event', eventId });
  }, []);

  const checkInEvent = useCallback((eventId: string) => {
    dispatch({ type: 'check-in-event', eventId });
  }, []);

  const setUser = useCallback((user: User | null) => {
    dispatch({ type: 'set-user', user });
  }, []);

  const isEventSaved = useCallback(
    (eventId: string) => state.savedEventIds.includes(eventId),
    [state.savedEventIds],
  );

  const value = useMemo(
    () => ({
      ...state,
      saveEvent,
      unsaveEvent,
      checkInEvent,
      setUser,
      isEventSaved,
    }),
    [checkInEvent, isEventSaved, saveEvent, setUser, state, unsaveEvent],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }

  return context;
}
