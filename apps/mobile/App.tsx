import "react-native-gesture-handler";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Alert,
  Linking,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import * as Notifications from "expo-notifications";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import * as Localization from "expo-localization";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { API_BASE_URL, SUPPORT_EMAIL, SUPPORT_URL } from "./src/config";
import { theme } from "./src/theme";
import { Locale, t } from "./src/i18n";
import { AuthScreen, AuthMode } from "./src/screens/AuthScreen";
import { LobbyScreen } from "./src/screens/LobbyScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { RoomLobbyScreen } from "./src/screens/RoomLobbyScreen";
import { PlayScreen } from "./src/screens/PlayScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { DailyQuizScreen } from "./src/screens/DailyQuizScreen";
import { DailyResultsScreen } from "./src/screens/DailyResultsScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { EdgeSwipeBack } from "./src/components/EdgeSwipeBack";
import {
  InAppNotification,
  NotificationBanner,
  NotificationTone
} from "./src/components/NotificationBanner";
import {
  createRoom,
  deleteAccount,
  deactivateAccount,
  exportAccountData,
  fetchDailyQuiz,
  fetchDailyResults,
  fetchDailyHistory,
  fetchMe,
  fetchMyRooms,
  fetchStats,
  fetchQuizzes,
  fetchLeaderboard,
  fetchBadges,
  fetchRoom,
  fetchSummary,
  joinRoom,
  inviteToRoom,
  cancelRoomInvite,
  loginUser,
  loginWithApple,
  isAuthError,
  confirmPasswordReset,
  requestEmailVerification,
  requestPasswordReset,
  registerUser,
  submitDailyAnswer,
  updateEmail,
  updateProfile,
  updatePassword
} from "./src/api";
import { getRewardForResults } from "./src/data/rewards";
import {
  BadgesResponse,
  DailyQuizHistoryItem,
  DailyQuizResults,
  DailyQuizStatus,
  LeaderboardResponse,
  QuizSummary,
  RoomListItem,
  RoomState,
  RoomSummary,
  StatsResponse,
  User
} from "./src/data/types";

const MAIN_PANELS = ["lobby", "account"] as const;
const AUTH_TOKEN_KEY = "dq_auth_token";
const AUTH_USER_KEY = "dq_auth_user";
const LOCALE_KEY = "qwizzy_locale";
const AUTH_FIRST_OPEN_KEY = "qwizzy_auth_first_open_done";

const resolveDeviceLocale = (): Locale => {
  const deviceLocale = Localization.getLocales?.()[0]?.languageCode ?? "en";
  return deviceLocale === "fr" ? "fr" : "en";
};

const resolveDeviceCountry = (): string => {
  const region = Localization.getLocales?.()[0]?.regionCode;
  if (typeof region === "string" && region.trim()) {
    return region.trim().toUpperCase();
  }
  return "US";
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false
  })
});

type RoomSnapshot = {
  code: string;
  mode: "sync" | "async";
  status: "lobby" | "active" | "complete";
  quizTitle: string;
  totalQuestions: number;
  players: { id: number; displayName: string }[];
  progressByUserId: Record<number, number>;
  rematchReady: number[];
  inviteForMe?: boolean;
};

type RoomNotificationPayload = {
  roomCode: string;
  roomStatus: RoomSnapshot["status"];
};

type ApplePendingProfile = {
  token: string;
  user: User;
  displayName: string;
  country: "US" | "FR" | "GB" | "CA";
};

function parseRoomCodeFromUrl(url: string | null) {
  if (!url) return null;
  const queryMatch = /[?&]code=([^&]+)/i.exec(url);
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]).trim();
  }
  const pathMatch = /\/room\/([^/?#]+)/i.exec(url);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]).trim();
  }
  return null;
}

function normalizeProgressMap(progress: Record<string, number> | undefined) {
  const result: Record<number, number> = {};
  if (!progress) return result;
  Object.entries(progress).forEach(([key, value]) => {
    const id = Number(key);
    if (!Number.isNaN(id)) result[id] = value;
  });
  return result;
}

function snapshotFromRoomState(room: RoomState): RoomSnapshot {
  const progressByUserId: Record<number, number> = {};
  room.progress.forEach((item) => {
    progressByUserId[item.userId] = item.answeredCount;
  });
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    quizTitle: room.quiz.title,
    totalQuestions: room.quiz.questions.length,
    players: room.players.map((player) => ({ id: player.id, displayName: player.displayName })),
    progressByUserId,
    rematchReady: room.rematchReady ?? []
  };
}

function snapshotFromRoomList(room: RoomListItem): RoomSnapshot {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    quizTitle: room.quiz.title,
    totalQuestions: room.quiz.questions?.length ?? 0,
    players: room.players.map((player) => ({ id: player.id, displayName: player.displayName })),
    progressByUserId: normalizeProgressMap(room.progress),
    rematchReady: room.rematchReady ?? [],
    inviteForMe: room.myRole === "invited"
  };
}

export default function App() {
  const { width } = useWindowDimensions();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [restoringAuth, setRestoringAuth] = useState(true);
  const [panel, setPanel] = useState<"lobby" | "account" | "leaderboard">("lobby");
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");
  const [applePendingProfile, setApplePendingProfile] = useState<ApplePendingProfile | null>(null);

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [myRooms, setMyRooms] = useState<RoomListItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuizStatus | null>(null);
  const [dailyResults, setDailyResults] = useState<DailyQuizResults | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyQuizHistoryItem[]>([]);
  const [dailyStage, setDailyStage] = useState<"quiz" | "results" | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySubmitting, setDailySubmitting] = useState(false);

  const dailyStreaks = useMemo(() => {
    const dates = new Set<string>();
    dailyHistory.forEach((item) => dates.add(item.date));
    if (dailyResults?.date) dates.add(dailyResults.date);
    if (dates.size === 0) return { current: 0, best: 0 };

    const toTime = (value: string) => new Date(`${value}T00:00:00Z`).getTime();
    const dateList = Array.from(dates).sort((a, b) => toTime(b) - toTime(a));
    let best = 1;
    let current = 1;
    let run = 1;

    for (let i = 1; i < dateList.length; i += 1) {
      const prev = toTime(dateList[i - 1]);
      const next = toTime(dateList[i]);
      const diffDays = Math.round((prev - next) / 86400000);
      if (diffDays === 1) {
        run += 1;
      } else {
        best = Math.max(best, run);
        run = 1;
      }
    }
    best = Math.max(best, run);
    if (dailyResults?.date) {
      const latest = dateList[0];
      if (latest !== dailyResults.date) {
        current = 0;
      } else {
        current = 1;
        for (let i = 1; i < dateList.length; i += 1) {
          const prev = toTime(dateList[i - 1]);
          const next = toTime(dateList[i]);
          const diffDays = Math.round((prev - next) / 86400000);
          if (diffDays === 1) {
            current += 1;
          } else {
            break;
          }
        }
      }
    } else {
      current = 0;
    }
    return { current, best };
  }, [dailyHistory, dailyResults?.date]);
  const [recapRoom, setRecapRoom] = useState<RoomState | null>(null);
  const [recapSummary, setRecapSummary] = useState<RoomSummary | null>(null);
  const [leaderboardGlobal, setLeaderboardGlobal] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLocal, setLeaderboardLocal] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [badges, setBadges] = useState<BadgesResponse | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<InAppNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<RoomState | null>(null);
  const recapRef = useRef<RoomState | null>(null);
  const roomSnapshotsRef = useRef<Map<string, RoomSnapshot>>(new Map());
  const hasLoadedRoomsRef = useRef(false);
  const closedRoomCodesRef = useRef<Set<string>>(new Set());
  const panelIndexRef = useRef(0);
  const swipeEnabledRef = useRef(false);
  const widthRef = useRef(width);
  const edgeDirectionRef = useRef<"left" | "right" | null>(null);
  const dragStartXRef = useRef(0);
  const panelTranslateX = useRef(new Animated.Value(0));
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const dailyAnswersMap = useMemo(() => {
    const result: Record<string, number> = {};
    dailyQuiz?.answers?.forEach((answer) => {
      result[answer.questionId] = answer.answerIndex;
    });
    return result;
  }, [dailyQuiz]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const code = parseRoomCodeFromUrl(url);
      if (code) setPendingJoinCode(code);
    };
    Linking.getInitialURL()
      .then((url) => {
        const code = parseRoomCodeFromUrl(url);
        if (code) setPendingJoinCode(code);
      })
      .catch(() => null);
    const subscription = Linking.addEventListener("url", handleUrl);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!pendingJoinCode || !token || loading || room) return;
    handleJoinRoom(pendingJoinCode);
    setPendingJoinCode(null);
  }, [pendingJoinCode, token, loading, room]);

  const panelIndex = MAIN_PANELS.indexOf(panel);
  const activePanelIndex = panelIndex >= 0 ? panelIndex : 0;
  const swipeEnabled =
    !loading && token && user && !room && !recapRoom && !dailyStage && hasSeenOnboarding;
  const panelSwipeEnabled = swipeEnabled && panelIndex >= 0;
  const showLobby = !loading && token && user && !room && hasSeenOnboarding;
  const lobbyIsActive = showLobby && panel === "lobby" && !recapRoom && !dailyStage;

  const snapToIndex = useCallback(
    (index: number, animated = true, velocity = 0) => {
      const target = -index * width;
      if (!animated) {
        panelTranslateX.current.setValue(target);
        return;
      }
      Animated.spring(panelTranslateX.current, {
        toValue: target,
        velocity,
        stiffness: 220,
        damping: 24,
        mass: 1,
        overshootClamping: true,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
        isInteraction: false,
        useNativeDriver: true
      }).start();
    },
    [width]
  );

  const goToLobby = useCallback(
    (instant = false) => {
      if (instant) snapToIndex(0, false);
      setPanel("lobby");
    },
    [snapToIndex]
  );

  const openMatchFromPayload = useCallback(
    (payload: RoomNotificationPayload) => {
      if (!payload?.roomCode || !token) return;
      closedRoomCodesRef.current.delete(payload.roomCode);
      if (payload.roomStatus === "complete") {
        handleOpenRecap(payload.roomCode);
      } else {
        handleResumeRoom(payload.roomCode);
      }
    },
    [token, handleOpenRecap, handleResumeRoom]
  );

  const dismissNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setActiveNotification(null);
  }, []);

  const enqueueNotification = useCallback(
    (notification: Omit<InAppNotification, "id"> & { id?: string }) => {
      if (!notificationsEnabled) return;
      const id =
        notification.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setNotificationQueue((prev) => [...prev, { ...notification, id }]);
    },
    [notificationsEnabled]
  );

  const scheduleSystemNotification = useCallback(
    async (title: string, body: string, payload: RoomNotificationPayload) => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: "room", ...payload }
          },
          trigger: null
        });
      } catch (_err) {
        return;
      }
    },
    []
  );

  const notifyRoomSnapshot = useCallback(
    (snapshot: RoomSnapshot, previous?: RoomSnapshot) => {
      if (!user || !previous || !notificationsEnabled) return;
      if (roomRef.current?.code === snapshot.code || recapRef.current?.code === snapshot.code) {
        return;
      }

      const opponent = snapshot.players.find((player) => player.id !== user.id);
      const opponentProgress = opponent ? snapshot.progressByUserId[opponent.id] ?? 0 : 0;
      const previousOpponentProgress = opponent
        ? previous.progressByUserId[opponent.id] ?? 0
        : 0;
      const myProgress = snapshot.progressByUserId[user.id] ?? 0;
      const payload = { roomCode: snapshot.code, roomStatus: snapshot.status };

      const notify = (titleKey: string, bodyKey: string, tone: NotificationTone) => {
        const title = t(locale, titleKey);
        const body = t(locale, bodyKey);
        enqueueNotification({
          title,
          body,
          tone,
          onPress: () => openMatchFromPayload(payload)
        });
        if (appStateRef.current !== "active") {
          scheduleSystemNotification(title, body, payload);
        }
      };

      if (snapshot.status === "complete" && previous.status !== "complete") {
        notify("notificationCompleteTitle", "notificationCompleteBody", "success");
      }

      if (snapshot.status === "active" && previous.status !== "active") {
        notify("notificationTurnTitle", "notificationTurnBody", "primary");
      } else if (
        snapshot.mode === "async" &&
        snapshot.status === "active" &&
        opponentProgress > previousOpponentProgress &&
        myProgress < snapshot.totalQuestions
      ) {
        notify("notificationTurnTitle", "notificationTurnBody", "primary");
      }

      const previousReady = new Set(previous.rematchReady ?? []);
      const newlyReady = (snapshot.rematchReady ?? []).filter((id) => !previousReady.has(id));
      if (newlyReady.some((id) => id !== user.id)) {
        notify("notificationRematchTitle", "notificationRematchBody", "accent");
      }

      if (snapshot.inviteForMe && !previous.inviteForMe) {
        notify("notificationInviteTitle", "notificationInviteBody", "accent");
      }
    },
    [enqueueNotification, locale, notificationsEnabled, openMatchFromPayload, scheduleSystemNotification, user]
  );

  const processRoomSnapshot = useCallback(
    (snapshot: RoomSnapshot) => {
      const previous = roomSnapshotsRef.current.get(snapshot.code);
      if (previous) {
        notifyRoomSnapshot(snapshot, previous);
      } else if (snapshot.inviteForMe && hasLoadedRoomsRef.current) {
        notifyRoomSnapshot(snapshot, { ...snapshot, inviteForMe: false });
      }
      roomSnapshotsRef.current.set(snapshot.code, snapshot);
    },
    [notifyRoomSnapshot]
  );

  const processRoomListSnapshots = useCallback(
    (rooms: RoomListItem[]) => {
      const seen = new Set<string>();
      rooms.forEach((roomItem) => {
        const snapshot = snapshotFromRoomList(roomItem);
        seen.add(snapshot.code);
        processRoomSnapshot(snapshot);
      });
      for (const code of roomSnapshotsRef.current.keys()) {
        if (!seen.has(code)) {
          roomSnapshotsRef.current.delete(code);
        }
      }
    },
    [processRoomSnapshot]
  );

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const start = Date.now();
    const bootstrap = async () => {
      try {
        const [
          onboardingValue,
          notificationValue,
          storedLocale,
          storedToken,
          storedUser,
          authFirstOpenDone
        ] = await Promise.all([
          AsyncStorage.getItem("dq_onboarding"),
          AsyncStorage.getItem("dq_notifications"),
          AsyncStorage.getItem(LOCALE_KEY),
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
          AsyncStorage.getItem(AUTH_FIRST_OPEN_KEY)
        ]);
        if (onboardingValue === "seen") setHasSeenOnboarding(true);
        if (notificationValue === "off") setNotificationsEnabled(false);
        if (storedLocale === "fr" || storedLocale === "en") {
          setLocale(storedLocale);
        } else {
          setLocale(resolveDeviceLocale());
        }
        if (storedToken && storedUser) {
          try {
            const parsed = JSON.parse(storedUser) as User;
            if (parsed?.id && parsed?.email) {
              setToken(storedToken);
              setUser(parsed);
            }
          } catch {
            // ignore invalid cached user
          }
        } else if (authFirstOpenDone !== "yes") {
          setAuthMode("register");
          AsyncStorage.setItem(AUTH_FIRST_OPEN_KEY, "yes").catch(() => null);
        }
      } catch {
        // ignore bootstrap errors
      } finally {
        if (isMounted) setRestoringAuth(false);
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 1200 - elapsed);
        timeoutId = setTimeout(() => {
          if (isMounted) setSplashVisible(false);
        }, remaining);
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active" && token) {
        fetchMe(token)
          .then((data) => setUser(data.user))
          .catch((err) => {
            handleAuthFailure(err);
          });
      }
    });
    return () => subscription.remove();
  }, [token]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const register = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      AsyncStorage.setItem("dq_push_token", tokenResponse.data).catch(() => null);
    };
    register().catch(() => null);
  }, [notificationsEnabled]);

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        roomCode?: string;
        roomStatus?: RoomSnapshot["status"];
      };
      if (data?.type === "room" && data.roomCode) {
        openMatchFromPayload({
          roomCode: data.roomCode,
          roomStatus: data.roomStatus ?? "active"
        });
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as {
        type?: string;
        roomCode?: string;
        roomStatus?: RoomSnapshot["status"];
      };
      if (data?.type === "room" && data.roomCode) {
        enqueueNotification({
          title: notification.request.content.title ?? t(locale, "notificationTurnTitle"),
          body: notification.request.content.body ?? t(locale, "notificationTurnBody"),
          tone: "primary",
          onPress: () =>
            openMatchFromPayload({
              roomCode: data.roomCode,
              roomStatus: data.roomStatus ?? "active"
            })
        });
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data as {
        type?: string;
        roomCode?: string;
        roomStatus?: RoomSnapshot["status"];
      };
      if (data?.type === "room" && data.roomCode) {
        openMatchFromPayload({
          roomCode: data.roomCode,
          roomStatus: data.roomStatus ?? "active"
        });
      }
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [enqueueNotification, locale, openMatchFromPayload]);

  useEffect(() => {
    if (notificationsEnabled) return;
    setNotificationQueue([]);
    setActiveNotification(null);
  }, [notificationsEnabled]);

  useEffect(() => {
    if (activeNotification || notificationQueue.length === 0) return;
    setActiveNotification(notificationQueue[0]);
    setNotificationQueue((prev) => prev.slice(1));
  }, [activeNotification, notificationQueue]);

  useEffect(() => {
    if (!activeNotification) return;
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 4600);
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [activeNotification]);

  useEffect(() => {
    if (!roomError) return;
    if (roomErrorTimeoutRef.current) {
      clearTimeout(roomErrorTimeoutRef.current);
    }
    roomErrorTimeoutRef.current = setTimeout(() => {
      setRoomError(null);
    }, 4200);
    return () => {
      if (roomErrorTimeoutRef.current) {
        clearTimeout(roomErrorTimeoutRef.current);
      }
    };
  }, [roomError]);

  useEffect(() => {
    if (!authError) return;
    if (authErrorTimeoutRef.current) {
      clearTimeout(authErrorTimeoutRef.current);
    }
    authErrorTimeoutRef.current = setTimeout(() => {
      setAuthError(null);
    }, 4200);
    return () => {
      if (authErrorTimeoutRef.current) {
        clearTimeout(authErrorTimeoutRef.current);
      }
    };
  }, [authError]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchQuizzes()
      .then(setQuizzes)
      .catch(() => setRoomError(t(locale, "unableQuizzes")))
      .finally(() => setLoading(false));
  }, [token, locale]);

  useEffect(() => {
    if (!token) return;
    fetchMe(token)
      .then((data) => setUser((prev) => (prev ? { ...prev, ...data.user } : data.user)))
      .catch((err) => {
        handleAuthFailure(err);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !user || panel !== "lobby" || !hasSeenOnboarding) return;
    refreshMyRooms();
    fetchStats(token)
      .then(setStats)
      .catch((err) => {
        handleAuthFailure(err);
      });
  }, [token, user, panel, hasSeenOnboarding]);

  useEffect(() => {
    if (!token || !user || panel !== "lobby" || !hasSeenOnboarding) return;
    refreshDailyQuiz();
  }, [token, user, panel, hasSeenOnboarding]);

  useEffect(() => {
    if (!token || !user || panel !== "lobby" || !hasSeenOnboarding || room || recapRoom) return;
    const interval = setInterval(() => refreshMyRooms(), 15000);
    return () => clearInterval(interval);
  }, [token, user, panel, hasSeenOnboarding, room, recapRoom]);

  function refreshDailyQuiz() {
    if (!token) return Promise.resolve(null);
    setDailyLoading(true);
    return fetchDailyQuiz(token)
      .then((data) => {
        setDailyQuiz((prev) => {
          if (prev?.date && prev.date !== data.date) {
            setDailyResults(null);
            setDailyHistory([]);
          }
          return data;
        });
        if (data.completed) {
          return fetchDailyResults(token)
            .then((results) => {
              setDailyResults(results);
              return fetchDailyHistory(token, 7)
                .then((history) => {
                  setDailyHistory(history.history);
                  return data;
                })
                .catch((err) => {
                  handleAuthFailure(err);
                  return data;
                });
            })
            .catch((err) => {
              handleAuthFailure(err);
              return data;
            });
        }
        return fetchDailyHistory(token, 7)
          .then((history) => {
            setDailyHistory(history.history);
            return data;
          })
          .catch((err) => {
            handleAuthFailure(err);
            return data;
          });
      })
      .catch((err) => {
        handleAuthFailure(err);
        return null;
      })
      .finally(() => setDailyLoading(false));
  }

  function refreshMyRooms() {
    if (!token) return;
    fetchMyRooms(token)
      .then((data) => {
        setMyRooms(data.rooms);
        processRoomListSnapshots(data.rooms);
        if (!hasLoadedRoomsRef.current) {
          hasLoadedRoomsRef.current = true;
        }
      })
      .catch((err) => {
        handleAuthFailure(err);
      });
    fetchStats(token)
      .then(setStats)
      .catch((err) => {
        handleAuthFailure(err);
      });
  }

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    recapRef.current = recapRoom;
  }, [recapRoom]);

  useEffect(() => {
    if (panelIndex < 0) return;
    panelIndexRef.current = panelIndex;
    snapToIndex(panelIndex);
  }, [panelIndex, snapToIndex]);

  useEffect(() => {
    swipeEnabledRef.current = swipeEnabled;
  }, [swipeEnabled]);

  useEffect(() => {
    widthRef.current = width;
    if (panelIndex < 0) return;
    snapToIndex(panelIndex, false);
  }, [width, panelIndex, snapToIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        if (!swipeEnabledRef.current) return false;
        const touchX = event.nativeEvent.locationX;
        const edgeWidth = 36;
        if (touchX <= edgeWidth) {
          edgeDirectionRef.current = "left";
          return false;
        }
        if (touchX >= widthRef.current - edgeWidth) {
          edgeDirectionRef.current = "right";
          return false;
        }
        edgeDirectionRef.current = null;
        return false;
      },
      onMoveShouldSetPanResponder: (_event, gesture) => {
        if (!swipeEnabledRef.current || !edgeDirectionRef.current) return false;
        const { dx, dy } = gesture;
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return false;
        if (edgeDirectionRef.current === "left" && dx <= 0) return false;
        if (edgeDirectionRef.current === "right" && dx >= 0) return false;
        return true;
      },
      onPanResponderGrant: () => {
        dragStartXRef.current = -panelIndexRef.current * widthRef.current;
        panelTranslateX.current.stopAnimation();
        panelTranslateX.current.setValue(dragStartXRef.current);
      },
      onPanResponderMove: (_event, gesture) => {
        if (!edgeDirectionRef.current) return;
        const totalWidth = widthRef.current;
        const min = -(MAIN_PANELS.length - 1) * totalWidth;
        let next = dragStartXRef.current + gesture.dx;
        if (next > 0) next = next * 0.4;
        if (next < min) next = min + (next - min) * 0.4;
        panelTranslateX.current.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        edgeDirectionRef.current = null;
        const { dx, vx } = gesture;
        const threshold = widthRef.current * 0.25;
        const currentIndex = panelIndexRef.current;
        let nextIndex = currentIndex;
        if (Math.abs(dx) > threshold || Math.abs(vx) > 0.5) {
          if (dx < 0) nextIndex = Math.min(currentIndex + 1, MAIN_PANELS.length - 1);
          if (dx > 0) nextIndex = Math.max(currentIndex - 1, 0);
        }
        if (nextIndex !== currentIndex) {
          setPanel(MAIN_PANELS[nextIndex]);
        }
        snapToIndex(nextIndex, true, vx);
      },
      onPanResponderTerminate: () => {
        edgeDirectionRef.current = null;
        snapToIndex(panelIndexRef.current);
      }
    })
  ).current;

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(API_BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("auth", { token });
    });

    socket.on("auth:error", ({ error }) => {
      setAuthError(error || t(locale, "authFailed"));
      handleLogout();
    });

    socket.on("room:update", (state: RoomState) => {
      processRoomSnapshot(snapshotFromRoomState(state));
      if (
        closedRoomCodesRef.current.has(state.code) &&
        roomRef.current?.code !== state.code &&
        recapRef.current?.code !== state.code
      ) {
        return;
      }
      const current = roomRef.current;
      if (current && current.code === state.code) {
        setRoom(state);
        if (state.status === "complete") {
          fetchSummary(token, state.code)
            .then((data) => setSummary(data))
            .catch((err) => {
              handleAuthFailure(err);
            });
        }
        return;
      }
      const recapCurrent = recapRef.current;
      if (recapCurrent && recapCurrent.code === state.code) {
        setRecapRoom(state);
        if (state.status === "active") {
          setRecapRoom(null);
          setRecapSummary(null);
          setRoom(state);
          setSelectedAnswers({});
        }
        return;
      }
      refreshMyRooms();
    });

    socket.on("room:error", ({ error }) => {
      if (error && String(error).toLowerCase().includes("unauthorized")) {
        setAuthError(t(locale, "authFailed"));
        handleLogout();
        return;
      }
      setRoomError(error || "Room error");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  useEffect(() => {
    if (!token || !user || panel !== "leaderboard") return;
    setLeaderboardLoading(true);
    setBadgesLoading(true);
    Promise.all([fetchLeaderboard(token, "global"), fetchLeaderboard(token, "country", user.country)])
      .then(([globalData, localData]) => {
        setLeaderboardGlobal(globalData);
        setLeaderboardLocal(localData);
      })
      .catch((err) => {
        handleAuthFailure(err);
      })
      .finally(() => setLeaderboardLoading(false));
    fetchBadges(token)
      .then(setBadges)
      .catch((err) => {
        handleAuthFailure(err);
      })
      .finally(() => setBadgesLoading(false));
  }, [token, user, panel]);

  const recentReward = useMemo(() => {
    if (!recapSummary || !user) return null;
    return getRewardForResults({ scores: recapSummary.scores, total: recapSummary.total, userId: user.id });
  }, [recapSummary, user]);

  useEffect(() => {
    AsyncStorage.setItem("dq_notifications", notificationsEnabled ? "on" : "off").catch(() => null);
  }, [notificationsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => null);
  }, [locale]);

  useEffect(() => {
    if (!token || !user) return;
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token).catch(() => null);
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)).catch(() => null);
  }, [token, user]);

  async function handleAuth(payload: {
    email: string;
    password: string;
    displayName?: string;
    locale: Locale;
    country: string;
  }) {
    setAuthError(null);
    setLoading(true);
    try {
      const response =
        authMode === "login"
          ? await loginUser(payload.email, payload.password)
          : await registerUser(
              payload.email,
              payload.password,
              payload.displayName || "Player",
              payload.country
            );
      setToken(response.token);
      setUser(response.user);
      setPanel("lobby");
      if (authMode === "register") {
        setLocale(payload.locale);
      }
      AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token).catch(() => null);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user)).catch(() => null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t(locale, "authFailed");
      if (message.toLowerCase().includes("deactivated")) {
        setAuthError(t(locale, "accountDeactivated"));
      } else {
        setAuthError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    if (loading) return;
    setAuthError(null);
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });
      if (!credential.identityToken) {
        throw new Error(t(locale, "authFailed"));
      }
      const response = await loginWithApple({
        identityToken: credential.identityToken,
        email: credential.email,
        fullName: credential.fullName,
        country: resolveDeviceCountry()
      });
      if (response.isNewUser) {
        const deviceCountry = resolveDeviceCountry();
        const normalizedCountry =
          deviceCountry === "US" || deviceCountry === "FR" || deviceCountry === "GB" || deviceCountry === "CA"
            ? deviceCountry
            : "US";
        setApplePendingProfile({
          token: response.token,
          user: response.user,
          displayName: response.user.displayName || "",
          country: normalizedCountry
        });
        return;
      }

      setToken(response.token);
      setUser(response.user);
      setPanel("lobby");
      AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token).catch(() => null);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user)).catch(() => null);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "ERR_CANCELED") {
        return;
      }
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleProfileSetup(payload: {
    displayName: string;
    country: "US" | "FR" | "GB" | "CA";
    locale: Locale;
  }) {
    if (!applePendingProfile) return;
    setAuthError(null);
    setLoading(true);
    try {
      const response = await updateProfile(applePendingProfile.token, {
        displayName: payload.displayName,
        country: payload.country
      });
      const updatedUser = response?.user ?? {
        ...applePendingProfile.user,
        displayName: payload.displayName,
        country: payload.country
      };
      setLocale(payload.locale);
      setToken(applePendingProfile.token);
      setUser(updatedUser);
      setPanel("lobby");
      setApplePendingProfile(null);
      AsyncStorage.setItem(AUTH_TOKEN_KEY, applePendingProfile.token).catch(() => null);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser)).catch(() => null);
      AsyncStorage.setItem(LOCALE_KEY, payload.locale).catch(() => null);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate(email: string, password: string) {
    setAuthError(null);
    if (!email || !password) {
      setAuthError(t(locale, "authFailed"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error || t(locale, "authFailed"));
      }
      const data = await response.json();
      setToken(data.token);
      setUser(data.user);
      setPanel("lobby");
      AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token).catch(() => null);
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)).catch(() => null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(email: string) {
    try {
      await requestPasswordReset(email);
      setAuthError(t(locale, "resetSent"));
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    }
  }

  async function handleResetConfirm(token: string, newPassword: string) {
    try {
      await confirmPasswordReset({ token, newPassword });
      setAuthError(t(locale, "passwordUpdated"));
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    }
  }

  async function handleOpenDailyQuiz() {
    if (!token) return;
    setRoomError(null);
    const data = dailyQuiz || (await refreshDailyQuiz());
    if (!data) return;
    setDailyStage("quiz");
  }

  async function handleOpenDailyResults() {
    if (!token) return;
    setRoomError(null);
    setDailyLoading(true);
    try {
      const results = await fetchDailyResults(token);
      setDailyResults(results);
      const history = await fetchDailyHistory(token, 7).catch((err) => {
        handleAuthFailure(err);
        return null;
      });
      if (history) setDailyHistory(history.history);
      setDailyStage("results");
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setDailyLoading(false);
    }
  }

  function handleCloseDaily() {
    setDailyStage(null);
  }

  async function handleDailyAnswer(questionId: string, answerIndex: number) {
    if (!token || !dailyQuiz || dailySubmitting) return;
    if (dailyAnswersMap[questionId] !== undefined) return;
    setDailySubmitting(true);
    setRoomError(null);
    try {
      const result = await submitDailyAnswer(token, { questionId, answerIndex });
      setDailyQuiz((prev) => {
        if (!prev) return prev;
        const alreadyAnswered = prev.answers.some((item) => item.questionId === questionId);
        const nextAnswers = alreadyAnswered
          ? prev.answers
          : [...prev.answers, { questionId, answerIndex }];
        return {
          ...prev,
          answers: nextAnswers,
          answeredCount: result.answeredCount,
          correctCount: result.correctCount,
          wrongCount: result.wrongCount,
          totalQuestions: result.totalQuestions,
          completed: result.completed
        };
      });
      if (result.completed) {
        const results = await fetchDailyResults(token);
        setDailyResults(results);
        const history = await fetchDailyHistory(token, 7).catch((err) => {
          handleAuthFailure(err);
          return null;
        });
        if (history) setDailyHistory(history.history);
        setDailyStage("results");
      }
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setDailySubmitting(false);
    }
  }

  async function handleCreateRoom(
    categoryId: string,
    questionCount: number,
    mode: "sync" | "async"
  ) {
    if (!token) return;
    setRoomError(null);
    setDailyStage(null);
    setLoading(true);
    try {
      const state = await createRoom(token, { categoryId, questionCount, mode });
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom(code: string) {
    if (!token) return;
    setRoomError(null);
    setDailyStage(null);
    setLoading(true);
    try {
      const state = await joinRoom(token, code);
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenRecap(code: string) {
    if (!token) return;
    setRoomError(null);
    setDailyStage(null);
    try {
      const [roomData, summaryData] = await Promise.all([
        fetchRoom(token, code),
        fetchSummary(token, code)
      ]);
      setPanel("lobby");
      setRecapRoom(roomData);
      setRecapSummary(summaryData);
      closedRoomCodesRef.current.delete(code);
      socketRef.current?.emit("room:join", { code });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleResumeRoom(code: string) {
    if (!token) return;
    setRoomError(null);
    setDailyStage(null);
    try {
      const state = await joinRoom(token, code);
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleUpdateProfile(payload: { displayName?: string; country?: string }) {
    if (!token) return;
    try {
      const response = await updateProfile(token, payload);
      setUser(response.user);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleChangePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }) {
    if (!token) return;
    try {
      await updatePassword(token, payload);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      throw err;
    }
  }

  async function handleChangeEmail(payload: {
    newEmail: string;
    currentPassword: string;
  }) {
    if (!token) return;
    try {
      const response = await updateEmail(token, payload);
      if (response?.email) {
        setUser((prev) =>
          prev
            ? { ...prev, email: response.email, emailVerified: response.emailVerified ?? false }
            : prev
        );
      }
    } catch (err) {
      if (handleAuthFailure(err)) return;
      throw err;
    }
  }

  async function handleExportData() {
    if (!token) return;
    const canShare = await Sharing.isAvailableAsync().catch(() => false);
    if (!canShare) {
      Alert.alert(t(locale, "exportData"), t(locale, "deleteAccountError"));
      return;
    }
    try {
      const data = await exportAccountData(token);
      const filename = `quiz-app-export-${Date.now()}.json`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        Alert.alert(t(locale, "exportData"), t(locale, "deleteAccountError"));
        return;
      }
      const uri = `${baseDir}${filename}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2));
      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        dialogTitle: t(locale, "exportData")
      });
    } catch (err) {
      if (handleAuthFailure(err)) return;
      Alert.alert(t(locale, "exportData"), t(locale, "deleteAccountError"));
    }
  }

  function handleContactSupport() {
    if (SUPPORT_URL) {
      Linking.openURL(SUPPORT_URL).catch(() => null);
      return;
    }
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => null);
  }

  async function handleResendVerification() {
    if (!user?.email) return;
    try {
      await requestEmailVerification(user.email);
      setRoomError(t(locale, "verificationSent"));
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  function handleStartRoom() {
    if (!room) return;
    socketRef.current?.emit("room:start", { code: room.code });
  }

  async function handleInviteOpponent(opponentId: number, opponentName: string) {
    if (!token || !room) return;
    setRoomError(null);
    try {
      const updated = await inviteToRoom(token, room.code, opponentId);
      setRoom(updated);
      setRoomError(t(locale, "inviteSentToast", { name: opponentName }));
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleCancelInvite(opponentId: number, opponentName: string) {
    if (!token || !room) return;
    setRoomError(null);
    try {
      const updated = await cancelRoomInvite(token, room.code, opponentId);
      setRoom(updated);
      setRoomError(t(locale, "inviteCancelledToast", { name: opponentName }));
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  function handleAnswer(questionId: string, answerIndex: number) {
    if (!room) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    socketRef.current?.emit("room:answer", { code: room.code, questionId, answerIndex });
  }

  function handleLeaveRoom() {
    if (room?.code) {
      closedRoomCodesRef.current.add(room.code);
    }
    setRoom(null);
    setSelectedAnswers({});
    setSummary(null);
    setPanel("lobby");
    refreshMyRooms();
  }

  function handleCloseRecap() {
    if (recapRoom?.code) {
      closedRoomCodesRef.current.add(recapRoom.code);
    }
    setRecapRoom(null);
    setRecapSummary(null);
    setPanel("lobby");
    refreshMyRooms();
  }

  function handleRematch() {
    const target = room ?? recapRoom;
    if (!target) return;
    setSummary(null);
    setSelectedAnswers({});
    socketRef.current?.emit("room:join", { code: target.code });
    socketRef.current?.emit("room:rematch", { code: target.code });
  }

  function handleLogout() {
    setAuthMode("login");
    setApplePendingProfile(null);
    setToken(null);
    setUser(null);
    setRoom(null);
    setSummary(null);
    setSelectedAnswers({});
    setActiveNotification(null);
    setNotificationQueue([]);
    setRecapRoom(null);
    setRecapSummary(null);
    setDailyQuiz(null);
    setDailyResults(null);
    setDailyHistory([]);
    setDailyStage(null);
    closedRoomCodesRef.current.clear();
    setPanel("lobby");
    AsyncStorage.removeItem(AUTH_TOKEN_KEY).catch(() => null);
    AsyncStorage.removeItem(AUTH_USER_KEY).catch(() => null);
  }

  function handleAuthFailure(err: unknown) {
    if (isAuthError(err)) {
      handleLogout();
      return true;
    }
    return false;
  }

  function handleOpenPrivacy() {
    Linking.openURL(`${API_BASE_URL}/legal/privacy`).catch(() => null);
  }

  function handleOpenTerms() {
    Linking.openURL(`${API_BASE_URL}/legal/terms`).catch(() => null);
  }

  function handleDeleteAccount() {
    if (!token) return;
    Alert.alert(
      t(locale, "deleteAccountTitle"),
      t(locale, "deleteAccountBody"),
      [
        { text: t(locale, "deleteAccountCancel"), style: "cancel" },
        {
          text: t(locale, "deleteAccountConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount(token);
              Alert.alert(t(locale, "deleteAccount"), t(locale, "deleteAccountSuccess"));
              handleLogout();
            } catch (err) {
              if (handleAuthFailure(err)) return;
              Alert.alert(t(locale, "deleteAccount"), t(locale, "deleteAccountError"));
            }
          }
        }
      ],
      { cancelable: true }
    );
  }

  function handleDeactivateAccount() {
    if (!token) return;
    Alert.alert(
      t(locale, "deactivateAccountTitle"),
      t(locale, "deactivateAccountBody"),
      [
        { text: t(locale, "deleteAccountCancel"), style: "cancel" },
        {
          text: t(locale, "deactivateAccountConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateAccount(token);
              Alert.alert(
                t(locale, "deactivateAccount"),
                t(locale, "deactivateAccountSuccess")
              );
              handleLogout();
            } catch (err) {
              if (handleAuthFailure(err)) return;
              Alert.alert(t(locale, "deactivateAccount"), t(locale, "deleteAccountError"));
            }
          }
        }
      ],
      { cancelable: true }
    );
  }

  const lobbyScreen = !loading && token && user && !room && hasSeenOnboarding ? (
    <LobbyScreen
      quizzes={quizzes}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      onOpenAccount={() => setPanel("account")}
      onOpenPersonalLeaderboard={() => setPanel("leaderboard")}
      userName={user.displayName}
      locale={locale}
      userId={user.id}
      sessions={myRooms}
      recapStats={stats}
      onOpenRecap={handleOpenRecap}
      onResumeRoom={handleResumeRoom}
      dailyQuiz={dailyQuiz}
      dailyResults={dailyResults}
      dailyLoading={dailyLoading}
      onOpenDailyQuiz={handleOpenDailyQuiz}
      onOpenDailyResults={handleOpenDailyResults}
      dailyBestStreak={dailyStreaks.best}
    />
  ) : null;

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safe}
          edges={
            splashVisible
              ? []
              : lobbyIsActive
              ? ["left", "right"]
              : ["top", "left", "right"]
          }
        >
        <StatusBar style="dark" />

      {splashVisible ? (
        <SplashScreen locale={locale} />
      ) : (
        <>

      {loading && token && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.ink} size="large" />
        </View>
      )}

      {!token && !restoringAuth && (
        <AuthScreen
          mode={authMode}
          onToggleMode={() => setAuthMode(authMode === "login" ? "register" : "login")}
          onSubmit={handleAuth}
          onForgotPassword={handleForgotPassword}
          onResetConfirm={handleResetConfirm}
          onReactivate={handleReactivate}
          onAppleSignIn={handleAppleSignIn}
          appleProfileSetup={applePendingProfile}
          onSubmitAppleProfile={handleAppleProfileSetup}
          error={authError}
          onClearError={() => setAuthError(null)}
          loading={loading}
          locale={locale}
          onChangeLocale={setLocale}
        />
      )}

      {!loading && token && user && !room && !hasSeenOnboarding && (
        <OnboardingScreen
          locale={locale}
          onDone={() => {
            setHasSeenOnboarding(true);
            AsyncStorage.setItem("dq_onboarding", "seen").catch(() => null);
          }}
        />
      )}

      {panelSwipeEnabled && (
        <View style={styles.panelSwipeRoot} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.panelRow,
              {
                width: width * MAIN_PANELS.length,
                transform: [{ translateX: panelTranslateX.current }]
              }
            ]}
          >
            <View style={[styles.panelPage, { width }]}>
              {lobbyScreen}
            </View>
            <View style={[styles.panelPage, { width }]}>
              <AccountScreen
                user={user}
                onBack={() => setPanel("lobby")}
                onLogout={handleLogout}
                locale={locale}
                onChangeLocale={setLocale}
                onUpdateProfile={handleUpdateProfile}
                notificationsEnabled={notificationsEnabled}
                onToggleNotifications={() => setNotificationsEnabled((prev) => !prev)}
                onOpenPrivacy={handleOpenPrivacy}
                onOpenTerms={handleOpenTerms}
                onDeleteAccount={handleDeleteAccount}
                onDeactivateAccount={handleDeactivateAccount}
                onChangePassword={handleChangePassword}
                onChangeEmail={handleChangeEmail}
                onExportData={handleExportData}
                onContactSupport={handleContactSupport}
                onResendVerification={handleResendVerification}
                emailVerified={user.emailVerified}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {!loading && token && user && !room && panel === "leaderboard" && (
        <View style={styles.stackContainer}>
          <View style={styles.stackUnderlay} pointerEvents="none">
            {lobbyScreen}
          </View>
          <EdgeSwipeBack enabled onBack={() => goToLobby(true)}>
            <LeaderboardScreen
              locale={locale}
              global={leaderboardGlobal}
              local={leaderboardLocal}
              loading={leaderboardLoading}
              recapStats={stats}
              badges={badges}
              badgesLoading={badgesLoading}
              recentReward={recentReward}
              onBack={() => goToLobby(true)}
            />
          </EdgeSwipeBack>
        </View>
      )}

      {!loading && token && user && !room && recapRoom && recapSummary && (
        <EdgeSwipeBack
          enabled
          onBack={handleCloseRecap}
        >
          <ResultsScreen
            scores={recapSummary.scores}
            total={recapSummary.total}
            questions={recapSummary.questions}
            onBack={handleCloseRecap}
            onRematch={handleRematch}
            locale={locale}
            userId={user?.id}
            rematchReadyCount={recapRoom.rematchReady?.length ?? 0}
            rematchTotal={recapRoom.players?.length ?? 0}
            rematchReady={recapRoom.rematchReady ?? []}
          />
        </EdgeSwipeBack>
      )}

      {!loading && token && user && !room && dailyStage === "quiz" && dailyQuiz && (
        <EdgeSwipeBack enabled onBack={handleCloseDaily}>
          <DailyQuizScreen
            quiz={dailyQuiz.quiz}
            answers={dailyAnswersMap}
            answeredCount={dailyQuiz.answeredCount}
            totalQuestions={dailyQuiz.totalQuestions}
            completed={dailyQuiz.completed}
            submitting={dailySubmitting}
            onAnswer={handleDailyAnswer}
            onExit={handleCloseDaily}
            onSeeResults={handleOpenDailyResults}
            locale={locale}
          />
        </EdgeSwipeBack>
      )}

      {!loading && token && user && !room && dailyStage === "results" && dailyResults && (
        <EdgeSwipeBack enabled onBack={handleCloseDaily}>
          <DailyResultsScreen
            results={dailyResults}
            history={dailyHistory}
            streakCount={dailyStreaks.current}
            onBack={handleCloseDaily}
            locale={locale}
          />
        </EdgeSwipeBack>
      )}


      {!loading && token && user && room && room.status === "lobby" && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <RoomLobbyScreen
            room={room}
            user={user}
            onStart={handleStartRoom}
            onLeave={handleLeaveRoom}
            onInviteOpponent={handleInviteOpponent}
            onCancelInvite={handleCancelInvite}
            recentOpponents={stats?.opponents ?? []}
            locale={locale}
          />
        </EdgeSwipeBack>
      )}

      {!loading && token && room && room.status === "active" && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <View style={styles.gameBackground}>
            <LinearGradient
              colors={["#EDF2FA", "#F9FBFF", "#FFFFFF"]}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={["rgba(94, 124, 255, 0.24)", "rgba(94, 124, 255, 0)"]}
              start={{ x: 0.0, y: 0.0 }}
              end={{ x: 0.7, y: 0.7 }}
              style={styles.gameSweep}
            />
            <View style={styles.gameOrb} pointerEvents="none" />
            <View style={styles.gameOrbAccent} pointerEvents="none" />
            <View style={styles.gameFog} pointerEvents="none" />
            <PlayScreen
              room={room}
              userId={user?.id ?? 0}
              selectedAnswers={selectedAnswers}
              onAnswer={handleAnswer}
              onExit={handleLeaveRoom}
              locale={locale}
            />
          </View>
        </EdgeSwipeBack>
      )}

      {!loading && token && room && room.status === "complete" && summary && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <ResultsScreen
            scores={summary.scores}
            total={summary.total}
            questions={summary.questions}
            onBack={handleLeaveRoom}
            onRematch={room ? handleRematch : undefined}
            locale={locale}
            userId={user?.id}
            rematchReadyCount={room.rematchReady?.length ?? 0}
            rematchTotal={room.players?.length ?? 0}
            rematchReady={room.rematchReady ?? []}
          />
        </EdgeSwipeBack>
      )}

      <NotificationBanner
        notification={activeNotification}
        onDismiss={dismissNotification}
      />

      {!loading && roomError && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{roomError}</Text>
        </View>
      )}
        </>
      )}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent"
  },
  gestureRoot: {
    flex: 1
  },
  panelSwipeRoot: {
    flex: 1,
    overflow: "hidden"
  },
  panelRow: {
    flex: 1,
    flexDirection: "row"
  },
  gameBackground: {
    flex: 1,
    position: "relative"
  },
  gameSweep: {
    ...StyleSheet.absoluteFillObject
  },
  gameOrb: {
    position: "absolute",
    top: -220,
    right: -180,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(94, 124, 255, 0.16)"
  },
  gameOrbAccent: {
    position: "absolute",
    bottom: -240,
    left: -200,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(46, 196, 182, 0.12)"
  },
  gameFog: {
    position: "absolute",
    top: "36%",
    alignSelf: "center",
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "rgba(255, 255, 255, 0.55)"
  },
  panelPage: {
    flex: 1
  },
  stackContainer: {
    flex: 1
  },
  stackUnderlay: {
    ...StyleSheet.absoluteFillObject
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl
  },
  toast: {
    position: "absolute",
    bottom: theme.spacing.xl,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    backgroundColor: theme.colors.ink,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg
  },
  toastText: {
    color: theme.colors.surface,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  }
});
