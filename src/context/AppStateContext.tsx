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
} from 'react';

import { appMode } from '@/constants/app-mode';
import { getStoredValue, setStoredValue } from '@/services/authStorage';
import {
  cancelEventRegistration as serviceCancelEventRegistration,
  checkInEvent as serviceCheckInEvent,
  getEventByIdSync,
  registerEvent as serviceRegisterEvent,
} from '@/services/eventService';
import {
  cancelRemoteRegistration,
  checkInRemoteEvent,
  fetchRemoteRegistrations,
  fetchRemoteSavedEvents,
  registerRemoteEvent,
  saveRemoteEvent,
  unsaveRemoteEvent,
} from '@/services/remoteStudentService';
import { getRemoteToken } from '@/services/remoteAuthService';
import { ApiError } from '@/services/apiClient';
import type { AuthUser } from '@/types/auth';

type AppState = {
  user: AuthUser | null;
  savedEventIds: string[];
  checkedInEventIds: string[];
  registeredEventIds: string[];
};

type AppAction =
  | { type: 'set-user'; user: AuthUser | null }
  | {
      type: 'hydrate-events';
      savedEventIds: string[];
      checkedInEventIds: string[];
    }
  | {
      type: 'set-personal-data';
      savedEventIds: string[];
      checkedInEventIds: string[];
      registeredEventIds: string[];
    }
  | { type: 'clear-personal-data' }
  | { type: 'save-event'; eventId: string }
  | { type: 'unsave-event'; eventId: string }
  | { type: 'register-event'; eventId: string }
  | { type: 'cancel-registration'; eventId: string }
  | { type: 'check-in-event'; eventId: string };

type AppStateContextValue = AppState & {
  saveEvent: (eventId: string) => Promise<void> | void;
  unsaveEvent: (eventId: string) => Promise<void> | void;
  registerEvent: (eventId: string) => Promise<void>;
  cancelRegistration: (eventId: string) => Promise<void>;
  checkInEvent: (
    eventId: string,
    qrValue?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  setUser: (user: AuthUser | null) => void;
  isEventSaved: (eventId: string) => boolean;
  isEventRegistered: (eventId: string) => boolean;
  isEventCheckedIn: (eventId: string) => boolean;
  refreshPersonalData: () => Promise<void>;
  isLoadingPersonalData: boolean;
  personalDataError: string | null;
};

const initialState: AppState = {
  user: null,
  savedEventIds: [],
  checkedInEventIds: [],
  registeredEventIds: [],
};

const isEventExpired = (eventId: string) => {
  const event = getEventByIdSync(eventId);
  return !event || new Date(event.startsAt).getTime() <= Date.now();
};

const sanitizeStoredIds = (eventIds: string[]) => [
  ...new Set(eventIds.filter((eventId) => !isEventExpired(eventId))),
];

const APP_STATE_STORAGE_KEY = 'iuh-event-app-state';

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'set-user':
      return { ...state, user: action.user };
    case 'hydrate-events':
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
    case 'set-personal-data':
      return {
        ...state,
        savedEventIds: [...new Set(action.savedEventIds)],
        checkedInEventIds: [...new Set(action.checkedInEventIds)],
        registeredEventIds: [...new Set(action.registeredEventIds)],
      };
    case 'clear-personal-data':
      return {
        ...state,
        savedEventIds: [],
        checkedInEventIds: [],
        registeredEventIds: [],
      };
    case 'save-event':
      if (state.savedEventIds.includes(action.eventId)) {
        return state;
      }
      return {
        ...state,
        savedEventIds: [...state.savedEventIds, action.eventId],
      };
    case 'unsave-event':
      return {
        ...state,
        savedEventIds: state.savedEventIds.filter(
          (eventId) => eventId !== action.eventId,
        ),
      };
    case 'register-event':
      if (state.registeredEventIds.includes(action.eventId)) {
        return state;
      }
      return {
        ...state,
        registeredEventIds: [...state.registeredEventIds, action.eventId],
      };
    case 'cancel-registration':
      return {
        ...state,
        registeredEventIds: state.registeredEventIds.filter(
          (eventId) => eventId !== action.eventId,
        ),
      };
    case 'check-in-event':
      return {
        ...state,
        checkedInEventIds: state.checkedInEventIds.includes(action.eventId)
          ? state.checkedInEventIds
          : [...state.checkedInEventIds, action.eventId],
        savedEventIds: state.savedEventIds.includes(action.eventId)
          ? state.savedEventIds
          : [...state.savedEventIds, action.eventId],
      };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isLoadingPersonalData, setIsLoadingPersonalData] = useState(false);
  const [personalDataError, setPersonalDataError] = useState<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Demo mode local storage hydration
  useEffect(() => {
    if (appMode !== 'demo') return;
    let isActive = true;

    const hydrateEvents = async () => {
      try {
        const storedValue = await getStoredValue(APP_STATE_STORAGE_KEY);
        if (storedValue) {
          try {
            const parsed: unknown = JSON.parse(storedValue);
            if (parsed && typeof parsed === 'object') {
              const persisted = parsed as {
                savedEventIds?: unknown;
                checkedInEventIds?: unknown;
              };
              const nextSavedEventIds = sanitizeStoredIds([
                ...(Array.isArray(persisted.savedEventIds)
                  ? persisted.savedEventIds.filter(
                      (eventId): eventId is string => typeof eventId === 'string',
                    )
                  : []),
                ...stateRef.current.savedEventIds,
              ]);
              const nextCheckedInEventIds = sanitizeStoredIds([
                ...(Array.isArray(persisted.checkedInEventIds)
                  ? persisted.checkedInEventIds.filter(
                      (eventId): eventId is string => typeof eventId === 'string',
                    )
                  : []),
                ...stateRef.current.checkedInEventIds,
              ]);

              dispatch({
                type: 'hydrate-events',
                savedEventIds: nextSavedEventIds,
                checkedInEventIds: nextCheckedInEventIds,
              });
            }
          } catch {
            // Ignore malformed local data
          }
        }
        if (isActive) setIsStorageReady(true);
      } catch {
        // Keep in-memory state
      }
    };

    void hydrateEvents();
    return () => {
      isActive = false;
    };
  }, []);

  // Demo mode persistence
  useEffect(() => {
    if (appMode !== 'demo' || !isStorageReady) return;

    void setStoredValue(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        savedEventIds: state.savedEventIds,
        checkedInEventIds: state.checkedInEventIds,
      }),
    ).catch(() => {
      // Storage failures should not interrupt interactions
    });
  }, [isStorageReady, state.checkedInEventIds, state.savedEventIds]);

  // Remote mode sync
  const refreshPersonalData = useCallback(async () => {
    if (appMode !== 'remote') return;

    const token = await getRemoteToken();
    if (!token) {
      dispatch({ type: 'clear-personal-data' });
      return;
    }

    setIsLoadingPersonalData(true);
    setPersonalDataError(null);
    try {
      const [savedList, regList] = await Promise.all([
        fetchRemoteSavedEvents(),
        fetchRemoteRegistrations(),
      ]);

      const nextSavedIds = savedList.map((item) => item.eventId);
      const nextRegisteredIds = regList
        .filter((item) => item.status === 'registered' || item.status === 'checked-in')
        .map((item) => item.eventId);
      const nextCheckedInIds = regList
        .filter((item) => item.status === 'checked-in')
        .map((item) => item.eventId);

      dispatch({
        type: 'set-personal-data',
        savedEventIds: nextSavedIds,
        registeredEventIds: nextRegisteredIds,
        checkedInEventIds: nextCheckedInIds,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tải dữ liệu cá nhân.';
      setPersonalDataError(msg);
    } finally {
      setIsLoadingPersonalData(false);
    }
  }, []);

  useEffect(() => {
    if (appMode === 'remote') {
      if (state.user) {
        void refreshPersonalData();
      } else {
        dispatch({ type: 'clear-personal-data' });
      }
    }
  }, [state.user, refreshPersonalData]);

  const saveEvent = useCallback(
    async (eventId: string) => {
      if (appMode === 'remote') {
        dispatch({ type: 'save-event', eventId });
        try {
          await saveRemoteEvent(eventId);
        } catch (error) {
          dispatch({ type: 'unsave-event', eventId });
          throw error;
        }
      } else {
        const event = getEventByIdSync(eventId);
        if (!event || isEventExpired(eventId)) return;
        dispatch({ type: 'save-event', eventId });
      }
    },
    [],
  );

  const unsaveEvent = useCallback(
    async (eventId: string) => {
      if (appMode === 'remote') {
        dispatch({ type: 'unsave-event', eventId });
        try {
          await unsaveRemoteEvent(eventId);
        } catch (error) {
          dispatch({ type: 'save-event', eventId });
          throw error;
        }
      } else {
        dispatch({ type: 'unsave-event', eventId });
      }
    },
    [],
  );

  const registerEvent = useCallback(
    async (eventId: string) => {
      if (appMode === 'remote') {
        await registerRemoteEvent(eventId);
        dispatch({ type: 'register-event', eventId });
      } else {
        await serviceRegisterEvent(eventId);
        dispatch({ type: 'register-event', eventId });
      }
    },
    [],
  );

  const cancelRegistration = useCallback(
    async (eventId: string) => {
      if (appMode === 'remote') {
        await cancelRemoteRegistration(eventId);
        dispatch({ type: 'cancel-registration', eventId });
      } else {
        await serviceCancelEventRegistration(eventId);
        dispatch({ type: 'cancel-registration', eventId });
      }
    },
    [],
  );

  const checkInEvent = useCallback(
    async (eventId: string, qrValue?: string) => {
      if (appMode === 'remote') {
        const code = qrValue || eventId;
        await checkInRemoteEvent(eventId, code);
        dispatch({ type: 'check-in-event', eventId });
        return { success: true };
      } else {
        const event = getEventByIdSync(eventId);
        if (!event || isEventExpired(eventId)) {
          return { success: false, message: 'Sự kiện không hợp lệ hoặc đã kết thúc.' };
        }
        const result = await serviceCheckInEvent(eventId, qrValue || eventId);
        if (result.success) {
          dispatch({ type: 'check-in-event', eventId });
        }
        return result;
      }
    },
    [],
  );

  const setUser = useCallback((user: AuthUser | null) => {
    dispatch({ type: 'set-user', user });
  }, []);

  const isEventSaved = useCallback(
    (eventId: string) => state.savedEventIds.includes(eventId),
    [state.savedEventIds],
  );

  const isEventRegistered = useCallback(
    (eventId: string) => state.registeredEventIds.includes(eventId),
    [state.registeredEventIds],
  );

  const isEventCheckedIn = useCallback(
    (eventId: string) => state.checkedInEventIds.includes(eventId),
    [state.checkedInEventIds],
  );

  const value = useMemo(
    () => ({
      ...state,
      saveEvent,
      unsaveEvent,
      registerEvent,
      cancelRegistration,
      checkInEvent,
      setUser,
      isEventSaved,
      isEventRegistered,
      isEventCheckedIn,
      refreshPersonalData,
      isLoadingPersonalData,
      personalDataError,
    }),
    [
      state,
      saveEvent,
      unsaveEvent,
      registerEvent,
      cancelRegistration,
      checkInEvent,
      setUser,
      isEventSaved,
      isEventRegistered,
      isEventCheckedIn,
      refreshPersonalData,
      isLoadingPersonalData,
      personalDataError,
    ],
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
    throw new Error('useAppState must be used inside AppStateProvider');
  }

  return context;
}
