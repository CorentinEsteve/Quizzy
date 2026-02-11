export type RoomSnapshot = {
  code: string;
  mode: "sync" | "async";
  status: "lobby" | "active" | "complete";
  quizTitle: string;
  totalQuestions: number;
  players: { id: number; displayName: string; role: string }[];
  progressByUserId: Record<number, number>;
  rematchReady: number[];
  inviteForMe?: boolean;
};

export type RoomNotificationEvent =
  | "invite_received"
  | "host_player_joined"
  | "room_started"
  | "your_turn"
  | "match_complete"
  | "rematch_requested";

function isHost(snapshot: RoomSnapshot, userId: number) {
  return snapshot.players.some((player) => player.id === userId && player.role === "host");
}

function countOpponents(snapshot: RoomSnapshot, userId: number) {
  return snapshot.players.filter((player) => player.id !== userId).length;
}

export function getRoomNotificationEvents(params: {
  snapshot: RoomSnapshot;
  previous: RoomSnapshot;
  userId: number;
}) {
  const { snapshot, previous, userId } = params;
  const events: RoomNotificationEvent[] = [];

  if (snapshot.inviteForMe && !previous.inviteForMe) {
    events.push("invite_received");
  }

  if (
    snapshot.status === "lobby" &&
    previous.status === "lobby" &&
    isHost(snapshot, userId) &&
    countOpponents(previous, userId) === 0 &&
    countOpponents(snapshot, userId) > 0
  ) {
    events.push("host_player_joined");
  }

  const justStarted = snapshot.status === "active" && previous.status !== "active";
  if (justStarted) {
    events.push("room_started");
  } else if (snapshot.mode === "async" && snapshot.status === "active") {
    const opponent = snapshot.players.find((player) => player.id !== userId);
    const opponentProgress = opponent ? snapshot.progressByUserId[opponent.id] ?? 0 : 0;
    const previousOpponentProgress = opponent ? previous.progressByUserId[opponent.id] ?? 0 : 0;
    const myProgress = snapshot.progressByUserId[userId] ?? 0;
    if (opponentProgress > previousOpponentProgress && myProgress < snapshot.totalQuestions) {
      events.push("your_turn");
    }
  }

  if (snapshot.status === "complete" && previous.status !== "complete") {
    events.push("match_complete");
  }

  const previousReady = new Set(previous.rematchReady ?? []);
  const newlyReady = (snapshot.rematchReady ?? []).filter((id) => !previousReady.has(id));
  if (newlyReady.some((id) => id !== userId)) {
    events.push("rematch_requested");
  }

  return events;
}
