import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { localizedCategoryLabel } from "../data/categories";
import { RoomState, StatsResponse, User } from "../data/types";
import { MIN_ROOM_PLAYERS_TO_START, resolveMaxRoomPlayers } from "../roomConfig";

type Props = {
  room: RoomState;
  user: User;
  onStart: () => void;
  onLeave: () => void;
  onShareInvite: () => void;
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
  onShareInvite,
  onInviteOpponent,
  onCancelInvite,
  recentOpponents,
  locale
}: Props) {
  const insets = useSafeAreaInsets();
  const maxPlayers = resolveMaxRoomPlayers(room);
  const seatsLeft = Math.max(maxPlayers - room.players.length, 0);
  const reservedCount = room.players.length + (room.invites?.length ?? 0);
  const hasEnoughPlayers = room.players.length >= MIN_ROOM_PLAYERS_TO_START;
  const isFull = room.players.length >= maxPlayers;
  const isHost = room.players.find((player) => player.id === user.id)?.role === "host";
  const canStart = isHost && hasEnoughPlayers;
  const footerInset = theme.spacing.lg + insets.bottom + 96;
  const modeLabel = room.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel");
  const statusPulse = useRef(new Animated.Value(0)).current;
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
  const canInviteOpponents = isHost && reservedCount < maxPlayers;
  const canManageInvites = isHost;
  const headerHint = hasEnoughPlayers
    ? t(locale, "lobbyReady")
    : t(locale, "lobbyInviteHint");
  const statusHeroHint = hasEnoughPlayers
    ? isHost
      ? t(locale, "lobbyStartHint")
      : t(locale, "lobbyGuestHint")
    : t(locale, "inviteBody");

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(statusPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [statusPulse]);

  const pulseScale = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.6]
  });
  const pulseOpacity = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0]
  });

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#DCEBFF", "#EAF8FF", "#FFF6E8"]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(94, 124, 255, 0.24)", "rgba(94, 124, 255, 0)"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.backgroundSweep}
      />
      <LinearGradient
        colors={["rgba(255, 184, 92, 0.18)", "rgba(255, 184, 92, 0)"]}
        start={{ x: 0.9, y: 0.1 }}
        end={{ x: 0.2, y: 0.6 }}
        style={styles.backgroundWarmSweep}
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
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
              {headerHint}
            </Text>
          </View>
        </View>

        <GlassCard style={[styles.card, styles.statusHeroCard]}>
          <LinearGradient
            colors={["rgba(94, 124, 255, 0.18)", "rgba(46, 196, 182, 0.15)", "rgba(255, 255, 255, 0.9)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusHeroBackdrop}
          />
          <View style={styles.statusHeroHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDotWrap}>
                <Animated.View
                  style={[
                    styles.liveDotPulse,
                    {
                      backgroundColor: hasEnoughPlayers
                        ? "rgba(34, 197, 94, 0.34)"
                        : "rgba(245, 158, 11, 0.36)",
                      opacity: pulseOpacity,
                      transform: [{ scale: pulseScale }]
                    }
                  ]}
                />
                <View style={[styles.liveDot, hasEnoughPlayers && styles.liveDotReady]} />
              </View>
              <Text style={styles.liveText}>
                {hasEnoughPlayers ? t(locale, "lobbyStatusReady") : t(locale, "lobbyStatusOpen")}
              </Text>
            </View>
            <View style={styles.statusCountPill}>
              <Text style={styles.statusCountText}>
                {room.players.length}/{maxPlayers}
              </Text>
            </View>
          </View>
          <Text style={styles.statusHeroTitle}>
            {hasEnoughPlayers
              ? t(locale, "lobbyHeroReadyTitle")
              : t(locale, "lobbyHeroWaitingTitle")}
          </Text>
          <Text style={styles.statusHeroBody}>{statusHeroHint}</Text>
          <View style={styles.statusHeroCodeRow}>
            <View style={styles.statusHeroCodePill}>
              <FontAwesome name="hashtag" size={12} color={theme.colors.primary} />
              <Text style={styles.statusHeroCodeText}>{room.code}</Text>
            </View>
            <View style={styles.statusHeroModePill}>
              <Text style={styles.statusHeroModeText}>{modeLabel}</Text>
            </View>
          </View>
        </GlassCard>

        {!isFull ? (
          <GlassCard style={[styles.card, styles.inviteCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, styles.sectionIconPrimary]}>
                  <FontAwesome name="paper-plane" size={15} color={theme.colors.primary} />
                </View>
                <View style={styles.sectionHeadingText}>
                  <Text style={styles.sectionTitle}>{t(locale, "inviteFriendTitle")}</Text>
                  <Text style={styles.sectionMeta}>{t(locale, "inviteFriendBody")}</Text>
                </View>
              </View>
              {isHost ? (
                <Pressable
                  onPress={onShareInvite}
                  style={({ pressed }) => [
                    styles.shareAction,
                    pressed && styles.shareActionPressed
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t(locale, "shareInvite")}
                  accessibilityHint={t(locale, "inviteBody")}
                >
                  <FontAwesome name="share-alt" size={12} color={theme.colors.primary} />
                  <Text style={styles.shareActionText}>{t(locale, "shareInvite")}</Text>
                </Pressable>
              ) : null}
            </View>
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
        ) : null}

        <GlassCard style={[styles.card, styles.playersCard]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconAccent]}>
                <FontAwesome name="users" size={15} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "players")}</Text>
            </View>
            <Text style={styles.sectionMetaInline}>
              {room.players.length}/{maxPlayers}
            </Text>
          </View>
          {room.players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerIdentity}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>{initials(player.displayName)}</Text>
                </View>
                <Text style={styles.playerName}>{player.displayName}</Text>
              </View>
              <View style={styles.playerRolePill}>
                <Text style={styles.playerRole}>
                  {player.role === "host" ? t(locale, "host") : t(locale, "guest")}
                </Text>
              </View>
            </View>
          ))}
          {!isFull ? (
            <View style={styles.openSeat}>
              <Text style={styles.openSeatLabel}>
                {t(locale, "openSeat")} · {seatsLeft}
              </Text>
              <Pill label={t(locale, "readyToInvite")} />
            </View>
          ) : null}
        </GlassCard>

        <GlassCard style={[styles.card, styles.deckCard]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, styles.sectionIconMuted]}>
              <FontAwesome name="book" size={14} color={theme.colors.ink} />
            </View>
            <Text style={styles.sectionTitle}>{t(locale, "deck")}</Text>
          </View>
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
  backgroundWarmSweep: {
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
    gap: theme.spacing.xs,
    paddingHorizontal: 2
  },
  headerMeta: {
    gap: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
    fontSize: theme.typography.small,
    flex: 1,
    textAlign: "right"
  },
  card: {
    gap: theme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
    shadowColor: "rgba(18, 24, 40, 0.28)",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  statusHeroCard: {
    overflow: "hidden",
    borderColor: "rgba(94, 124, 255, 0.28)",
    backgroundColor: "rgba(248, 252, 255, 0.98)"
  },
  statusHeroBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  statusHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  liveDotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  liveDotPulse: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(245, 158, 11, 0.36)"
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(245, 158, 11, 0.95)"
  },
  liveDotReady: {
    backgroundColor: "rgba(34, 197, 94, 0.95)"
  },
  liveText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  statusCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.22)"
  },
  statusCountText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  statusHeroTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 27
  },
  statusHeroBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  statusHeroCodeRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  statusHeroCodePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.28)"
  },
  statusHeroCodeText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.7
  },
  statusHeroModePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  statusHeroModeText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  inviteCard: {
    borderColor: "rgba(94, 124, 255, 0.16)"
  },
  playersCard: {
    borderColor: "rgba(46, 196, 182, 0.2)"
  },
  deckCard: {
    borderColor: "rgba(245, 158, 11, 0.2)"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
    minWidth: 0
  },
  sectionHeadingText: {
    flex: 1,
    gap: 2
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  sectionIconPrimary: {
    backgroundColor: "rgba(94, 124, 255, 0.12)"
  },
  sectionIconAccent: {
    backgroundColor: "rgba(46, 196, 182, 0.16)"
  },
  sectionIconMuted: {
    backgroundColor: "rgba(245, 158, 11, 0.14)"
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  sectionMetaInline: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18
  },
  shareAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.24)",
    flexShrink: 0,
    marginTop: 2
  },
  shareActionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  shareActionText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(11, 14, 20, 0.08)"
  },
  playerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  playerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 124, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.22)"
  },
  playerAvatarText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700"
  },
  playerName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  playerRolePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  playerRole: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4
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
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
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
    backgroundColor: "rgba(255, 255, 255, 0.74)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)",
    shadowColor: "rgba(18, 24, 40, 0.18)",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
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
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.28)"
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
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "700"
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
    borderTopColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "rgba(248, 250, 255, 0.92)"
  },
  footerButton: {
    width: "100%"
  }
});
