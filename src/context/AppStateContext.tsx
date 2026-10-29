import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { getStoredValue, setStoredValue } from "@/services/authStorage";
import { getEventByIdSync } from "@/services/eventService";

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
  | { type: "set-user"; user: User | null }
  | {
      type: "hydrate-events";
      savedEventIds: string[];
      checkedInEventIds: string[];
    }
  | { type: "save-event"; eventId: string }
  | { type: "unsave-event"; eventId: string }
  | { type: "check-in-event"; eventId: string };

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

const isEventExpired = (eventId: string) => {
  const event = getEventByIdSync(eventId);
  return !event || new Date(event.startsAt).getTime() <= Date.now();
};

const sanitizeStoredIds = (eventIds: string[]) => [
  ...new Set(eventIds.filter((eventId) => !isEventExpired(eventId))),
];

const APP_STATE_STORAGE_KEY = "iuh-event-app-state";

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
);

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-user":
      return { ...state, user: action.user };
    case "hydrate-events":
      return {
        ...state,
        savedEventIds: sanitizeStoredIds([
          ...action.savedEventIds,
          ...state.savedEventIds,
        ]),
        checkedInEventIds: sanitizeStoredIds([
          ...action.checkedInEventIds,
          ...state.checkedInEventIds,
        ]),
      };
    case "save-event":
      if (state.savedEventIds.includes(action.eventId)) {
        return state;
      }
      return {
        ...state,
        savedEventIds: [...state.savedEventIds, action.eventId],
      };
    case "unsave-event":
      return {
        ...state,
        savedEventIds: state.savedEventIds.filter(
          (eventId) => eventId !== action.eventId,
        ),
      };
    case "check-in-event":
      if (state.checkedInEventIds.includes(action.eventId)) {
        return state;
      }
      return {
        ...state,
        checkedInEventIds: [...state.checkedInEventIds, action.eventId],
      };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isActive = true;

    const hydrateEvents = async () => {
      try {
        const storedValue = await getStoredValue(APP_STATE_STORAGE_KEY);
        if (storedValue) {
          try {
            const parsed: unknown = JSON.parse(storedValue);
            if (parsed && typeof parsed === "object") {
              const persisted = parsed as {
                savedEventIds?: unknown;
                checkedInEventIds?: unknown;
              };
              const nextSavedEventIds = sanitizeStoredIds([
                ...(Array.isArray(persisted.savedEventIds)
                  ? persisted.savedEventIds.filter(
                      (eventId): eventId is string =>
                        typeof eventId === "string",
                    )
                  : []),
                ...stateRef.current.savedEventIds,
              ]);
              const nextCheckedInEventIds = sanitizeStoredIds([
                ...(Array.isArray(persisted.checkedInEventIds)
                  ? persisted.checkedInEventIds.filter(
                      (eventId): eventId is string =>
                        typeof eventId === "string",
                    )
                  : []),
                ...stateRef.current.checkedInEventIds,
              ]);

              dispatch({
                type: "hydrate-events",
                savedEventIds: nextSavedEventIds,
                checkedInEventIds: nextCheckedInEventIds,
              });
            }
          } catch {
            // Ignore malformed local data and keep the app state usable.
          }
        }
        if (isActive) setIsStorageReady(true);
      } catch {
        // Keep the current session usable if device storage is temporarily unavailable.
      }
    };

    void hydrateEvents();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;

    void setStoredValue(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        savedEventIds: state.savedEventIds,
        checkedInEventIds: state.checkedInEventIds,
      }),
    ).catch(() => {
      // Storage failures should not interrupt in-memory app interactions.
    });
  }, [isStorageReady, state.checkedInEventIds, state.savedEventIds]);

  const saveEvent = useCallback((eventId: string) => {
    const event = getEventByIdSync(eventId);
    if (!event || isEventExpired(eventId)) return;
    dispatch({ type: "save-event", eventId });
  }, []);

  const unsaveEvent = useCallback((eventId: string) => {
    dispatch({ type: "unsave-event", eventId });
  }, []);

  const checkInEvent = useCallback((eventId: string) => {
    const event = getEventByIdSync(eventId);
    if (!event || isEventExpired(eventId)) return;
    dispatch({ type: "check-in-event", eventId });
  }, []);

  const setUser = useCallback((user: User | null) => {
    dispatch({ type: "set-user", user });
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

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }

  return context;
}
