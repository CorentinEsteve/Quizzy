import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InputField } from "../components/InputField";
import { User } from "../data/types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

type Props = {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  onUpdateProfile: (payload: { displayName?: string; country?: string }) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
};

function countryLabel(locale: Locale, code: string) {
  switch (code) {
    case "FR":
      return t(locale, "countryFr");
    case "GB":
      return t(locale, "countryGb");
    case "CA":
      return t(locale, "countryCa");
    case "US":
    default:
      return t(locale, "countryUs");
  }
}

export function AccountScreen({
  user,
  onBack,
  onLogout,
  locale,
  onChangeLocale,
  onUpdateProfile,
  notificationsEnabled,
  onToggleNotifications
}: Props) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [country, setCountry] = useState(user.country || "US");

  return (
    <View style={styles.page}>
      <LinearGradient colors={["#F4F6FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: theme.spacing.lg + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t(locale, "back")}
            hitSlop={8}
          >
            <FontAwesome name="arrow-left" size={16} color={theme.colors.ink} />
          </Pressable>
          <Text style={styles.title}>{t(locale, "account")}</Text>
        </View>

        <GlassCard style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(user.displayName || "Player")}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name}>{user.displayName}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.country}>
                {t(locale, "country")}: {countryLabel(locale, user.country || "US")}
              </Text>
            </View>
          </View>
          <PrimaryButton
            label={editing ? t(locale, "cancel") : t(locale, "editProfile")}
            variant="ghost"
            icon={editing ? "times" : "pencil"}
            onPress={() => {
              if (editing) {
                setDisplayName(user.displayName);
                setCountry(user.country || "US");
              }
              setEditing(!editing);
            }}
          />
        </GlassCard>

      {editing ? (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "profile")}</Text>
          <InputField
            label={t(locale, "displayName")}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Nova"
            autoCapitalize="words"
          />
          <Text style={styles.sectionSubtitle}>{t(locale, "country")}</Text>
          <View style={styles.optionGrid}>
            <Pressable
              style={[
                styles.languageOption,
                country === "US" ? styles.languageOptionActive : styles.languageOptionIdle
              ]}
              onPress={() => setCountry("US")}
            >
              <View style={styles.flagUs}>
                <View style={styles.flagUsStars} />
                <View style={styles.flagUsStripe} />
                <View style={[styles.flagUsStripe, styles.flagUsStripeAlt]} />
                <View style={[styles.flagUsStripe, styles.flagUsStripe3]} />
              </View>
              <Text
                style={[
                  styles.languageText,
                  country === "US" ? styles.languageTextActive : styles.languageTextIdle
                ]}
              >
                {t(locale, "countryUs")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.languageOption,
                country === "FR" ? styles.languageOptionActive : styles.languageOptionIdle
              ]}
              onPress={() => setCountry("FR")}
            >
              <View style={styles.flagFr}>
                <View style={[styles.flagFrStripe, styles.flagFrBlue]} />
                <View style={[styles.flagFrStripe, styles.flagFrWhite]} />
                <View style={[styles.flagFrStripe, styles.flagFrRed]} />
              </View>
              <Text
                style={[
                  styles.languageText,
                  country === "FR" ? styles.languageTextActive : styles.languageTextIdle
                ]}
              >
                {t(locale, "countryFr")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.languageOption,
                country === "GB" ? styles.languageOptionActive : styles.languageOptionIdle
              ]}
              onPress={() => setCountry("GB")}
            >
              <View style={styles.flagUk}>
                <View style={styles.flagUkWhiteHorizontal} />
                <View style={styles.flagUkWhiteVertical} />
                <View style={styles.flagUkRedHorizontal} />
                <View style={styles.flagUkRedVertical} />
              </View>
              <Text
                style={[
                  styles.languageText,
                  country === "GB" ? styles.languageTextActive : styles.languageTextIdle
                ]}
              >
                {t(locale, "countryGb")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.languageOption,
                country === "CA" ? styles.languageOptionActive : styles.languageOptionIdle
              ]}
              onPress={() => setCountry("CA")}
            >
              <View style={styles.flagCa}>
                <View style={[styles.flagCaStripe, styles.flagCaRed]} />
                <View style={[styles.flagCaStripe, styles.flagCaWhite]} />
                <View style={[styles.flagCaStripe, styles.flagCaRed]} />
              </View>
              <Text
                style={[
                  styles.languageText,
                  country === "CA" ? styles.languageTextActive : styles.languageTextIdle
                ]}
              >
                {t(locale, "countryCa")}
              </Text>
            </Pressable>
          </View>
          <PrimaryButton
            label={t(locale, "save")}
            icon="check"
            iconPosition="right"
            onPress={() => {
              onUpdateProfile({ displayName, country });
              setEditing(false);
            }}
          />
        </GlassCard>
      ) : null}

      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "membership")}</Text>
        <Text style={styles.sectionBody}>{t(locale, "membershipTier")}</Text>
        <Text style={styles.sectionMeta}>{t(locale, "membershipMeta")}</Text>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "security")}</Text>
        <Text style={styles.sectionBody}>{t(locale, "securityBody")}</Text>
        <Text style={styles.sectionMeta}>{t(locale, "securityMeta")}</Text>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "preferences")}</Text>
        <Text style={styles.sectionBody}>{t(locale, "appearance")}</Text>
        <Text style={styles.sectionMeta}>{t(locale, "appearanceBody")}</Text>
        <View style={[styles.preferenceRow, styles.subtleTop]}>
          <Text style={styles.sectionBody}>{t(locale, "notifications")}</Text>
          <Pressable
            style={[
              styles.toggle,
              notificationsEnabled ? styles.toggleOn : styles.toggleOff
            ]}
            hitSlop={8}
            onPress={onToggleNotifications}
          >
            <View style={styles.toggleKnob} />
          </Pressable>
        </View>
        <Text style={styles.sectionMeta}>{t(locale, "notificationsBody")}</Text>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "language")}</Text>
        <View style={styles.languageButtons}>
          <Pressable
            style={[
              styles.languageOption,
              locale === "en" ? styles.languageOptionActive : styles.languageOptionIdle
            ]}
            onPress={() => onChangeLocale("en")}
          >
            <View style={styles.flagUk}>
              <View style={styles.flagUkWhiteHorizontal} />
              <View style={styles.flagUkWhiteVertical} />
              <View style={styles.flagUkRedHorizontal} />
              <View style={styles.flagUkRedVertical} />
            </View>
            <Text
              style={[
                styles.languageText,
                locale === "en" ? styles.languageTextActive : styles.languageTextIdle
              ]}
            >
              {t(locale, "english")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.languageOption,
              locale === "fr" ? styles.languageOptionActive : styles.languageOptionIdle
            ]}
            onPress={() => onChangeLocale("fr")}
          >
            <View style={styles.flagFr}>
              <View style={[styles.flagFrStripe, styles.flagFrBlue]} />
              <View style={[styles.flagFrStripe, styles.flagFrWhite]} />
              <View style={[styles.flagFrStripe, styles.flagFrRed]} />
            </View>
            <Text
              style={[
                styles.languageText,
                locale === "fr" ? styles.languageTextActive : styles.languageTextIdle
              ]}
            >
              {t(locale, "french")}
            </Text>
          </Pressable>
        </View>
      </GlassCard>


      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "stats")}</Text>
        <Text style={styles.sectionBody}>{t(locale, "statsBody")}</Text>
        <Text style={styles.sectionMeta}>0</Text>
        <Text style={[styles.sectionBody, styles.subtleTop]}>{t(locale, "statsMeta")}</Text>
        <Text style={styles.sectionMeta}>0</Text>
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t(locale, "sessions")}</Text>
        <Text style={styles.sectionBody}>{t(locale, "sessionsBody")}</Text>
        <Text style={styles.sectionMeta}>{new Date().toLocaleDateString()}</Text>
      </GlassCard>

        <View style={styles.footer}>
          <PrimaryButton
            label={t(locale, "signOut")}
            icon="sign-out"
            variant="ghost"
            tone="danger"
            onPress={onLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.06)"
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  profileCard: {
    gap: theme.spacing.sm
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  profileText: {
    flex: 1
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(94, 124, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "700"
  },
  name: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  email: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  country: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionCard: {
    gap: theme.spacing.xs
  },
  sectionTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionBody: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1
  },
  toggleOn: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
    alignItems: "flex-end"
  },
  toggleOff: {
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    borderColor: "rgba(11, 14, 20, 0.2)",
    alignItems: "flex-start"
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surface
  },
  subtleTop: {
    marginTop: theme.spacing.sm
  },
  languageButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 44,
    minWidth: 140
  },
  languageOptionActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  languageOptionIdle: {
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  languageText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  languageTextActive: {
    color: theme.colors.surface
  },
  languageTextIdle: {
    color: theme.colors.ink
  },
  flagUk: {
    width: 20,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#0A3D91",
    overflow: "hidden"
  },
  flagUkWhiteHorizontal: {
    position: "absolute",
    top: 4,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#FFFFFF"
  },
  flagUkWhiteVertical: {
    position: "absolute",
    left: 7,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: "#FFFFFF"
  },
  flagUkRedHorizontal: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D12D2C"
  },
  flagUkRedVertical: {
    position: "absolute",
    left: 8,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#D12D2C"
  },
  flagFr: {
    width: 20,
    height: 12,
    borderRadius: 2,
    overflow: "hidden",
    flexDirection: "row"
  },
  flagFrStripe: {
    flex: 1
  },
  flagFrBlue: {
    backgroundColor: "#1A3D8F"
  },
  flagFrWhite: {
    backgroundColor: "#FFFFFF"
  },
  flagFrRed: {
    backgroundColor: "#D12D2C"
  },
  flagUs: {
    width: 20,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#B22234",
    overflow: "hidden"
  },
  flagUsStars: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 9,
    height: 6,
    backgroundColor: "#3C3B6E"
  },
  flagUsStripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    height: 2,
    backgroundColor: "#FFFFFF"
  },
  flagUsStripeAlt: {
    top: 6
  },
  flagUsStripe3: {
    top: 10
  },
  flagCa: {
    width: 20,
    height: 12,
    borderRadius: 2,
    overflow: "hidden",
    flexDirection: "row"
  },
  flagCaStripe: {
    flex: 1
  },
  flagCaRed: {
    backgroundColor: "#D12D2C"
  },
  flagCaWhite: {
    backgroundColor: "#FFFFFF"
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  footer: {
    marginTop: theme.spacing.lg
  }
});
