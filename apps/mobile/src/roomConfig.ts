export const DEFAULT_MAX_ROOM_PLAYERS = 8;
export const MIN_ROOM_PLAYERS_TO_START = 2;

export function resolveMaxRoomPlayers(room: { maxPlayers?: number } | null | undefined) {
  const value = room?.maxPlayers;
  if (Number.isInteger(value) && value && value >= MIN_ROOM_PLAYERS_TO_START) {
    return value;
  }
  return DEFAULT_MAX_ROOM_PLAYERS;
}
