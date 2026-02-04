import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { API_BASE_URL } from "./src/config";
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
import { SplashScreen } from "./src/screens/SplashScreen";
import { EdgeSwipeBack } from "./src/components/EdgeSwipeBack";
import {
  InAppNotification,
  NotificationBanner,
  NotificationTone
} from "./src/components/NotificationBanner";
import {
  createRoom,
  fetchMyRooms,
  fetchStats,
  fetchQuizzes,
  fetchLeaderboard,
  fetchRoom,
  fetchSummary,
  joinRoom,
  loginUser,
  registerUser,
  updateProfile
} from "./src/api";
import { LeaderboardResponse, QuizSummary, RoomListItem, RoomState, ScoreEntry, StatsResponse, User } from "./src/data/types";

const MAIN_PANELS = ["lobby", "account"] as const;

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
};

type RoomNotificationPayload = {
  roomCode: string;
  roomStatus: RoomSnapshot["status"];
};

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
    rematchReady: room.rematchReady ?? []
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
  const [panel, setPanel] = useState<"lobby" | "account" | "leaderboard">("lobby");
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");

  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<{ scores: ScoreEntry[]; total: number } | null>(null);
  const [myRooms, setMyRooms] = useState<RoomListItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recapRoom, setRecapRoom] = useState<RoomState | null>(null);
  const [recapSummary, setRecapSummary] = useState<{ scores: ScoreEntry[]; total: number } | null>(null);
  const [leaderboardGlobal, setLeaderboardGlobal] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLocal, setLeaderboardLocal] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<InAppNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<RoomState | null>(null);
  const recapRef = useRef<RoomState | null>(null);
  const roomSnapshotsRef = useRef<Map<string, RoomSnapshot>>(new Map());
  const closedRoomCodesRef = useRef<Set<string>>(new Set());
  const panelIndexRef = useRef(0);
  const swipeEnabledRef = useRef(false);
  const widthRef = useRef(width);
  const edgeDirectionRef = useRef<"left" | "right" | null>(null);
  const dragStartXRef = useRef(0);
  const panelTranslateX = useRef(new Animated.Value(0));
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const panelIndex = MAIN_PANELS.indexOf(panel);
  const activePanelIndex = panelIndex >= 0 ? panelIndex : 0;
  const swipeEnabled = !loading && token && user && !room && !recapRoom && hasSeenOnboarding;
  const panelSwipeEnabled = swipeEnabled && panelIndex >= 0;
  const showLobby = !loading && token && user && !room && hasSeenOnboarding;
  const lobbyIsActive = showLobby && panel === "lobby" && !recapRoom;

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
    },
    [enqueueNotification, locale, notificationsEnabled, openMatchFromPayload, scheduleSystemNotification, user]
  );

  const processRoomSnapshot = useCallback(
    (snapshot: RoomSnapshot) => {
      const previous = roomSnapshotsRef.current.get(snapshot.code);
      if (previous) {
        notifyRoomSnapshot(snapshot, previous);
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
        const [onboardingValue, notificationValue] = await Promise.all([
          AsyncStorage.getItem("dq_onboarding"),
          AsyncStorage.getItem("dq_notifications")
        ]);
        if (onboardingValue === "seen") setHasSeenOnboarding(true);
        if (notificationValue === "off") setNotificationsEnabled(false);
      } catch {
        // ignore bootstrap errors
      } finally {
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
    });
    return () => subscription.remove();
  }, []);

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
    if (!token) return;
    setLoading(true);
    fetchQuizzes()
      .then(setQuizzes)
      .catch(() => setRoomError(t(locale, "unableQuizzes")))
      .finally(() => setLoading(false));
  }, [token, locale]);

  useEffect(() => {
    if (!token || !user || panel !== "lobby" || !hasSeenOnboarding) return;
    refreshMyRooms();
    fetchStats(token).then(setStats).catch(() => null);
  }, [token, user, panel, hasSeenOnboarding]);

  useEffect(() => {
    if (!token || !user || panel !== "lobby" || !hasSeenOnboarding || room || recapRoom) return;
    const interval = setInterval(() => refreshMyRooms(), 15000);
    return () => clearInterval(interval);
  }, [token, user, panel, hasSeenOnboarding, room, recapRoom]);

  function refreshMyRooms() {
    if (!token) return;
    fetchMyRooms(token)
      .then((data) => {
        setMyRooms(data.rooms);
        processRoomListSnapshots(data.rooms);
      })
      .catch(() => null);
    fetchStats(token).then(setStats).catch(() => null);
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
            .catch(() => null);
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
    Promise.all([fetchLeaderboard(token, "global"), fetchLeaderboard(token, "country", user.country)])
      .then(([globalData, localData]) => {
        setLeaderboardGlobal(globalData);
        setLeaderboardLocal(localData);
      })
      .catch(() => null)
      .finally(() => setLeaderboardLoading(false));
  }, [token, user, panel]);

  useEffect(() => {
    AsyncStorage.setItem("dq_notifications", notificationsEnabled ? "on" : "off").catch(() => null);
  }, [notificationsEnabled]);

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
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t(locale, "authFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom(quizId: string) {
    if (!token) return;
    setRoomError(null);
    setLoading(true);
    try {
      const state = await createRoom(token, quizId);
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom(code: string) {
    if (!token) return;
    setRoomError(null);
    setLoading(true);
    try {
      const state = await joinRoom(token, code);
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenRecap(code: string) {
    if (!token) return;
    setRoomError(null);
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
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleResumeRoom(code: string) {
    if (!token) return;
    setRoomError(null);
    try {
      const state = await joinRoom(token, code);
      setRoom(state);
      setSelectedAnswers({});
      closedRoomCodesRef.current.delete(state.code);
      socketRef.current?.emit("room:join", { code: state.code });
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  async function handleUpdateProfile(payload: { displayName?: string; country?: string }) {
    if (!token) return;
    try {
      const response = await updateProfile(token, payload);
      setUser(response.user);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : t(locale, "roomError"));
    }
  }

  function handleStartRoom() {
    if (!room) return;
    socketRef.current?.emit("room:start", { code: room.code });
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
    setToken(null);
    setUser(null);
    setRoom(null);
    setSummary(null);
    setSelectedAnswers({});
    setActiveNotification(null);
    setNotificationQueue([]);
    setRecapRoom(null);
    setRecapSummary(null);
    closedRoomCodesRef.current.clear();
    setPanel("lobby");
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

      {!token && (
        <AuthScreen
          mode={authMode}
          onToggleMode={() => setAuthMode(authMode === "login" ? "register" : "login")}
          onSubmit={handleAuth}
          error={authError}
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


      {!loading && token && user && room && room.status === "lobby" && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <RoomLobbyScreen
            room={room}
            user={user}
            onStart={handleStartRoom}
            onLeave={handleLeaveRoom}
            locale={locale}
          />
        </EdgeSwipeBack>
      )}

      {!loading && token && room && room.status === "active" && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <PlayScreen
            room={room}
            userId={user?.id ?? 0}
            selectedAnswers={selectedAnswers}
            onAnswer={handleAnswer}
            onExit={handleLeaveRoom}
            locale={locale}
          />
        </EdgeSwipeBack>
      )}

      {!loading && token && room && room.status === "complete" && summary && (
        <EdgeSwipeBack enabled onBack={handleLeaveRoom}>
          <ResultsScreen
            scores={summary.scores}
            total={summary.total}
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
