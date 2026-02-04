import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoomState, User } from "../data/types";

type Props = {
  room: RoomState;
  user: User;
  onStart: () => void;
  onLeave: () => void;
  locale: Locale;
};

export function RoomLobbyScreen({ room, user, onStart, onLeave, locale }: Props) {
  const insets = useSafeAreaInsets();
  const isHost = room.players.find((player) => player.id === user.id)?.role === "host";
  const hasBothPlayers = room.players.length >= 2;
  const canStart = isHost && hasBothPlayers;
  const footerInset = theme.spacing.lg + insets.bottom + 96;

  return (
    <View style={[styles.container, { paddingBottom: footerInset }]}>
      <LinearGradient colors={["#F5F7FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>
          {t(locale, "roomTitle")} {room.code}
        </Text>
        <Text style={styles.subtitle}>
          {room.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel")}
        </Text>
      </View>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t(locale, "inviteCode")}</Text>
        <Text style={styles.code}>{room.code}</Text>
        <Text style={styles.sectionMeta}>{t(locale, "inviteBody")}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t(locale, "players")}</Text>
        {room.players.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <Text style={styles.playerName}>{player.displayName}</Text>
            <Text style={styles.playerRole}>
              {player.role === "host" ? t(locale, "host") : t(locale, "guest")}
            </Text>
          </View>
        ))}
        {room.players.length < 2 ? (
          <Text style={styles.waiting}>{t(locale, "lobbyWaiting")}</Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t(locale, "status")}</Text>
        <Text style={styles.statusText}>
          {hasBothPlayers ? t(locale, "lobbyReady") : t(locale, "lobbyWaiting")}
        </Text>
        {hasBothPlayers ? (
          <Text style={styles.sectionMeta}>
            {isHost ? t(locale, "lobbyStartHint") : t(locale, "lobbyGuestHint")}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t(locale, "deck")}</Text>
        <Text style={styles.deckTitle}>{room.quiz.title}</Text>
        <Text style={styles.deckSubtitle}>{room.quiz.subtitle}</Text>
      </GlassCard>

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
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
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
  sectionTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.2
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
  waiting: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  code: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700",
    letterSpacing: 2
  },
  statusText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
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
