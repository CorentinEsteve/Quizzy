import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { Pill } from "../components/Pill";
import { PrimaryButton } from "../components/PrimaryButton";
import { RoomState, User } from "../data/types";

type Props = {
  room: RoomState;
  user: User;
  onStart: () => void;
  onLeave: () => void;
  onShareInvite: () => void;
  locale: Locale;
};

export function RoomLobbyScreen({ room, user, onStart, onLeave, onShareInvite, locale }: Props) {
  const insets = useSafeAreaInsets();
  const isHost = room.players.find((player) => player.id === user.id)?.role === "host";
  const hasBothPlayers = room.players.length >= 2;
  const canStart = isHost && hasBothPlayers;
  const footerInset = theme.spacing.lg + insets.bottom + 96;
  const modeLabel = room.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel");

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
          <Text style={styles.sectionTitle}>{t(locale, "inviteCode")}</Text>
          <Text style={styles.code}>{room.code}</Text>
          <View style={styles.inviteActions}>
            <PrimaryButton
              label={t(locale, "shareInvite")}
              icon="share-alt"
              variant="ghost"
              onPress={onShareInvite}
              style={styles.inviteButton}
            />
          </View>
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
            <Text style={styles.waiting}>{t(locale, "lobbyWaiting")}</Text>
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
              : t(locale, "lobbyWaiting")}
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "deck")}</Text>
          <Text style={styles.deckTitle}>{room.quiz.title}</Text>
          <Text style={styles.deckSubtitle}>{room.quiz.subtitle}</Text>
          <View style={styles.metaRow}>
            <Pill label={room.quiz.categoryLabel} />
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
  waiting: {
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
  inviteActions: {
    marginTop: theme.spacing.xs
  },
  inviteButton: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm
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
