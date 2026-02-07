import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { localizedCategoryLabel } from "../data/categories";
import { RoomState, StatsResponse, User } from "../data/types";

type Props = {
  room: RoomState;
  user: User;
  onStart: () => void;
  onLeave: () => void;
  onInviteOpponent: (opponentId: number, opponentName: string) => void;
  onCancelInvite: (opponentId: number, opponentName: string) => void;
  recentOpponents: StatsResponse["opponents"];
  locale: Locale;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

export function RoomLobbyScreen({
  room,
  user,
  onStart,
  onLeave,
  onInviteOpponent,
  onCancelInvite,
  recentOpponents,
  locale
}: Props) {
  const insets = useSafeAreaInsets();
  const isHost = room.players.find((player) => player.id === user.id)?.role === "host";
  const hasBothPlayers = room.players.length >= 2;
  const canStart = isHost && hasBothPlayers;
  const footerInset = theme.spacing.lg + insets.bottom + 96;
  const modeLabel = room.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel");
  const [invitedOpponentIds, setInvitedOpponentIds] = useState<number[]>([]);
  const invitedByRoom = useMemo(
    () => new Set((room.invites || []).map((invite) => invite.id)),
    [room.invites]
  );

  const availableOpponents = useMemo(() => {
    const activeIds = new Set(room.players.map((player) => player.id));
    return recentOpponents.filter((opponent) => !activeIds.has(opponent.opponentId));
  }, [recentOpponents, room.players]);
  const visibleOpponents = availableOpponents.slice(0, 4);
  const canInviteOpponents = isHost && !hasBothPlayers;
  const canManageInvites = isHost;

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#F4F6FA", "#F9FAFE", "#FFFFFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(94, 124, 255, 0.12)", "rgba(94, 124, 255, 0)"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.backgroundSweep}
      />
      <View style={styles.backgroundOrb} pointerEvents="none" />
      <View style={styles.backgroundOrbAccent} pointerEvents="none" />
      <View style={styles.backgroundGlow} pointerEvents="none" />
      <View style={styles.backgroundGlass} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: theme.spacing.lg + insets.top,
            paddingBottom: footerInset + theme.spacing.lg
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {t(locale, "roomTitle")} {room.code}
          </Text>
          <View style={styles.headerMeta}>
            <Pill label={modeLabel} />
            <Text style={styles.subtitle}>{t(locale, "inviteBody")}</Text>
          </View>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "inviteFriendTitle")}</Text>
          <Text style={styles.sectionMeta}>{t(locale, "inviteFriendBody")}</Text>
          <Text style={styles.code}>{room.code}</Text>
          {isHost ? (
            <View style={styles.inviteRecentBlock}>
              <View style={styles.inviteRecentHeader}>
                <Text style={styles.inviteRecentTitle}>{t(locale, "inviteRecentTitle")}</Text>
                {!canInviteOpponents ? (
                  <Text style={styles.inviteRoomFull}>{t(locale, "inviteRoomFull")}</Text>
                ) : null}
              </View>
              {visibleOpponents.length > 0 ? (
                <View style={styles.inviteOpponentList}>
                  {visibleOpponents.map((opponent) => {
                    const invited =
                      invitedByRoom.has(opponent.opponentId) ||
                      invitedOpponentIds.includes(opponent.opponentId);
                    const actionLabel = invited ? t(locale, "inviteCancel") : t(locale, "inviteAction");
                    const canPress = invited ? canManageInvites : canInviteOpponents;
                    return (
                      <View key={opponent.opponentId} style={styles.inviteOpponentRow}>
                        <View style={styles.inviteAvatar}>
                          <Text style={styles.inviteAvatarText}>
                            {initials(opponent.opponentName)}
                          </Text>
                        </View>
                        <View style={styles.inviteOpponentInfo}>
                          <Text style={styles.inviteOpponentName} numberOfLines={1}>
                            {opponent.opponentName}
                          </Text>
                          <Text style={styles.inviteOpponentMeta}>
                            {t(locale, "inviteRecord", {
                              wins: opponent.wins,
                              losses: opponent.losses,
                              ties: opponent.ties
                            })}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            if (!canPress) return;
                            if (invited) {
                              onCancelInvite(opponent.opponentId, opponent.opponentName);
                              setInvitedOpponentIds((prev) =>
                                prev.filter((id) => id !== opponent.opponentId)
                              );
                              return;
                            }
                            onInviteOpponent(opponent.opponentId, opponent.opponentName);
                            setInvitedOpponentIds((prev) =>
                              prev.includes(opponent.opponentId)
                                ? prev
                                : [...prev, opponent.opponentId]
                            );
                          }}
                          disabled={!canPress}
                          style={({ pressed }) => [
                            styles.inviteAction,
                            invited && styles.inviteActionCancel,
                            !canPress && styles.inviteActionDisabled,
                            pressed && canPress && styles.inviteActionPressed
                          ]}
                        >
                          <Text
                            style={[
                              styles.inviteActionText,
                              invited && styles.inviteActionTextCancel,
                              !canPress && styles.inviteActionTextDisabled
                            ]}
                          >
                            {actionLabel}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.inviteEmpty}>{t(locale, "inviteRecentEmpty")}</Text>
              )}
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t(locale, "players")}</Text>
            <Text style={styles.sectionMetaInline}>
              {room.players.length}/2
            </Text>
          </View>
          {room.players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <Text style={styles.playerName}>{player.displayName}</Text>
              <Text style={styles.playerRole}>
                {player.role === "host" ? t(locale, "host") : t(locale, "guest")}
              </Text>
            </View>
          ))}
          {room.players.length < 2 ? (
            <View style={styles.openSeat}>
              <Text style={styles.openSeatLabel}>{t(locale, "openSeat")}</Text>
              <Pill label={t(locale, "readyToInvite")} />
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t(locale, "status")}</Text>
            <Pill
              label={hasBothPlayers ? t(locale, "lobbyReady") : t(locale, "lobbyWaiting")}
              tone={hasBothPlayers ? "success" : "default"}
            />
          </View>
          <Text style={styles.sectionMeta}>
            {hasBothPlayers
              ? isHost
                ? t(locale, "lobbyStartHint")
                : t(locale, "lobbyGuestHint")
              : t(locale, "lobbyInviteHint")}
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "deck")}</Text>
          <Text style={styles.deckTitle}>{room.quiz.title}</Text>
          <Text style={styles.deckSubtitle}>{room.quiz.subtitle}</Text>
          <View style={styles.metaRow}>
            <Pill
              label={localizedCategoryLabel(locale, room.quiz.categoryId, room.quiz.categoryLabel)}
            />
            <Pill label={`${room.quiz.questions.length} ${t(locale, "questionsLabel")}`} />
            <Pill label={modeLabel} />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        <PrimaryButton
          label={t(locale, "leave")}
          icon="arrow-left"
          variant="ghost"
          onPress={onLeave}
          style={styles.footerButton}
        />
        {canStart ? (
          <PrimaryButton
            label={t(locale, "startDuel")}
            variant="primary"
            icon="play"
            iconPosition="right"
            onPress={onStart}
            style={styles.footerButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  backgroundOrb: {
    position: "absolute",
    top: -200,
    right: -150,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(94, 124, 255, 0.08)"
  },
  backgroundOrbAccent: {
    position: "absolute",
    bottom: -200,
    left: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(46, 196, 182, 0.08)"
  },
  backgroundGlow: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(255, 255, 255, 0.55)"
  },
  backgroundSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundGlass: {
    position: "absolute",
    top: 110,
    right: -30,
    width: 200,
    height: 200,
    borderRadius: 56,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    transform: [{ rotate: "12deg" }],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)"
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    gap: theme.spacing.xs
  },
  headerMeta: {
    gap: theme.spacing.xs
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  card: {
    gap: theme.spacing.sm
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  sectionMetaInline: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  playerName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  playerRole: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  openSeat: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)",
    backgroundColor: "rgba(11, 14, 20, 0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  openSeatLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  code: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "700",
    letterSpacing: 2
  },
  inviteRecentBlock: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm
  },
  inviteRecentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  inviteRecentTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  inviteRoomFull: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  inviteOpponentList: {
    gap: theme.spacing.sm
  },
  inviteOpponentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 16,
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  inviteAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(94, 124, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center"
  },
  inviteAvatarText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "700"
  },
  inviteOpponentInfo: {
    flex: 1,
    gap: 2
  },
  inviteOpponentName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  inviteOpponentMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  inviteAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  inviteActionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }]
  },
  inviteActionDisabled: {
    backgroundColor: "rgba(11, 14, 20, 0.03)",
    borderColor: "rgba(11, 14, 20, 0.06)"
  },
  inviteActionCancel: {
    backgroundColor: "rgba(235, 87, 87, 0.12)",
    borderColor: "rgba(235, 87, 87, 0.28)"
  },
  inviteActionText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  inviteActionTextCancel: {
    color: theme.colors.danger
  },
  inviteActionTextDisabled: {
    color: theme.colors.muted
  },
  inviteEmpty: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  deckTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  deckSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(245, 246, 248, 0.92)"
  },
  footerButton: {
    width: "100%"
  }
});
