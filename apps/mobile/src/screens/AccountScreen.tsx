import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InputField } from "../components/InputField";
import { Pill } from "../components/Pill";
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
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onDeleteAccount: () => void;
  onChangePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  onChangeEmail: (payload: { newEmail: string; currentPassword: string }) => Promise<void>;
  onExportData: () => Promise<void>;
  onContactSupport: () => void;
  onResendVerification: () => void;
  emailVerified?: boolean;
  onDeactivateAccount: () => void;
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
  onToggleNotifications,
  onOpenPrivacy,
  onOpenTerms,
  onDeleteAccount,
  onChangePassword,
  onChangeEmail,
  onExportData,
  onContactSupport,
  onResendVerification,
  emailVerified,
  onDeactivateAccount
}: Props) {
  const insets = useSafeAreaInsets();
  const [route, setRoute] = useState<
    "main" | "profile" | "security" | "data" | "legal" | "danger" | "language"
  >("main");
  const [displayName, setDisplayName] = useState(user.displayName);
  const [country, setCountry] = useState(user.country || "US");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const resetEmailForm = (email?: string) => {
    setNewEmail(email ?? user.email);
    setEmailPassword("");
  };

  useEffect(() => {
    setNewEmail(user.email);
  }, [user.email]);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const goBackToAccount = () => {
    setRoute("main");
  };

  if (route !== "main") {
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
              onPress={goBackToAccount}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t(locale, "back")}
              hitSlop={8}
            >
              <FontAwesome name="arrow-left" size={16} color={theme.colors.ink} />
            </Pressable>
            <Text style={styles.title}>
              {route === "profile"
                ? t(locale, "editProfile")
                : route === "security"
                ? t(locale, "securityAndLogin")
                : route === "data"
                ? t(locale, "privacyAndData")
                : route === "legal"
                ? t(locale, "legal")
                : route === "danger"
                ? t(locale, "accountActions")
                : t(locale, "language")}
            </Text>
          </View>

          {route === "profile" ? (
            <GlassCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t(locale, "profile")}</Text>
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
                  setRoute("main");
                }}
              />
            </GlassCard>
          ) : null}

          {route === "security" ? (
            <GlassCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t(locale, "changeEmail")}</Text>
              <InputField
                label={t(locale, "newEmail")}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="you@studio.com"
              />
              <InputField
                label={t(locale, "currentPassword")}
                value={emailPassword}
                onChangeText={setEmailPassword}
                placeholder="********"
                secureTextEntry
              />
              <PrimaryButton
                label={t(locale, "changeEmail")}
                icon="envelope"
                variant="ghost"
                onPress={async () => {
                  if (!newEmail.trim().includes("@")) {
                    Alert.alert(t(locale, "changeEmail"), t(locale, "authEmailError"));
                    return;
                  }
                  if (!emailPassword) {
                    Alert.alert(t(locale, "changeEmail"), t(locale, "authPasswordError"));
                    return;
                  }
                  if (emailSubmitting) return;
                  setEmailSubmitting(true);
                  try {
                    await onChangeEmail({ newEmail, currentPassword: emailPassword });
                    Alert.alert(t(locale, "changeEmail"), t(locale, "emailUpdated"));
                    resetEmailForm(newEmail.trim());
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : t(locale, "deleteAccountError");
                    Alert.alert(t(locale, "changeEmail"), message);
                  } finally {
                    setEmailSubmitting(false);
                  }
                }}
                disabled={emailSubmitting}
              />
              <View style={styles.detailDivider} />
              <Text style={styles.detailTitle}>{t(locale, "changePassword")}</Text>
              <InputField
                label={t(locale, "currentPassword")}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="********"
                secureTextEntry
              />
              <InputField
                label={t(locale, "newPassword")}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="********"
                secureTextEntry
              />
              <InputField
                label={t(locale, "confirmPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="********"
                secureTextEntry
              />
              <PrimaryButton
                label={t(locale, "changePassword")}
                icon="key"
                variant="ghost"
                onPress={async () => {
                  if (newPassword.length < 8) {
                    Alert.alert(t(locale, "changePassword"), t(locale, "passwordTooShort"));
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    Alert.alert(t(locale, "changePassword"), t(locale, "passwordMismatch"));
                    return;
                  }
                  if (!currentPassword) {
                    Alert.alert(t(locale, "changePassword"), t(locale, "authPasswordError"));
                    return;
                  }
                  if (passwordSubmitting) return;
                  setPasswordSubmitting(true);
                  try {
                    await onChangePassword({ currentPassword, newPassword });
                    Alert.alert(t(locale, "changePassword"), t(locale, "passwordUpdated"));
                    resetPasswordForm();
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : t(locale, "deleteAccountError");
                    Alert.alert(t(locale, "changePassword"), message);
                  } finally {
                    setPasswordSubmitting(false);
                  }
                }}
                disabled={passwordSubmitting}
              />
            </GlassCard>
          ) : null}

          {route === "data" ? (
            <GlassCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t(locale, "exportData")}</Text>
              <PrimaryButton
                label={t(locale, "exportData")}
                icon="download"
                variant="ghost"
                onPress={async () => {
                  try {
                    await onExportData();
                    Alert.alert(t(locale, "exportData"), t(locale, "exportReady"));
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : t(locale, "deleteAccountError");
                    Alert.alert(t(locale, "exportData"), message);
                  }
                }}
              />
            </GlassCard>
          ) : null}

          {route === "legal" ? (
            <GlassCard style={styles.detailCard}>
              <PrimaryButton
                label={t(locale, "privacyPolicy")}
                icon="lock"
                variant="ghost"
                onPress={onOpenPrivacy}
              />
              <PrimaryButton
                label={t(locale, "termsOfService")}
                icon="file-text"
                variant="ghost"
                onPress={onOpenTerms}
              />
            </GlassCard>
          ) : null}

          {route === "danger" ? (
            <GlassCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t(locale, "accountActions")}</Text>
              <PrimaryButton
                label={t(locale, "deactivateAccount")}
                icon="pause"
                variant="ghost"
                tone="danger"
                onPress={onDeactivateAccount}
              />
              <PrimaryButton
                label={t(locale, "deleteAccount")}
                icon="trash"
                variant="ghost"
                tone="danger"
                onPress={onDeleteAccount}
              />
            </GlassCard>
          ) : null}

          {route === "language" ? (
            <GlassCard style={styles.detailCard}>
              <Text style={styles.detailTitle}>{t(locale, "language")}</Text>
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
          ) : null}
        </ScrollView>
      </View>
    );
  }

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
              <View style={styles.profileMetaRow}>
                <Text style={styles.country}>
                  {t(locale, "country")}: {countryLabel(locale, user.country || "US")}
                </Text>
                <Pill
                  label={
                    emailVerified
                      ? t(locale, "emailVerifiedLabel")
                      : t(locale, "emailUnverifiedLabel")
                  }
                  tone={emailVerified ? "success" : "default"}
                />
              </View>
            </View>
          </View>
          <PrimaryButton
            label={t(locale, "editProfile")}
            variant="ghost"
            icon="pencil"
            onPress={() => {
              setDisplayName(user.displayName);
              setCountry(user.country || "US");
              setRoute("profile");
            }}
          />
        </GlassCard>

        {!emailVerified ? (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t(locale, "verifyEmail")}</Text>
            <Text style={styles.sectionBody}>{t(locale, "verifyEmailBody")}</Text>
            <PrimaryButton
              label={t(locale, "resendVerification")}
              icon="paper-plane"
              variant="ghost"
              onPress={onResendVerification}
            />
          </GlassCard>
        ) : null}

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "preferences")}</Text>
          <View style={styles.listGroup}>
            <View style={[styles.listRow, styles.listRowDivider]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "notifications")}</Text>
                <Text style={styles.rowSubtitle}>{t(locale, "notificationsBody")}</Text>
              </View>
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
            <Pressable style={styles.listRow} onPress={() => setRoute("language")}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "language")}</Text>
                <Text style={styles.rowSubtitle}>
                  {locale === "en" ? t(locale, "english") : t(locale, "french")}
                </Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "account")}</Text>
          <View style={styles.listGroup}>
            <Pressable
              style={[styles.listRow, styles.listRowDivider]}
              onPress={() => setRoute("security")}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "securityAndLogin")}</Text>
                <Text style={styles.rowSubtitle}>
                  {t(locale, "changeEmail")}, {t(locale, "changePassword")}
                </Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
            <Pressable
              style={[styles.listRow, styles.listRowDivider]}
              onPress={() => setRoute("data")}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "privacyAndData")}</Text>
                <Text style={styles.rowSubtitle}>{t(locale, "exportData")}</Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
            <Pressable
              style={[styles.listRow, styles.listRowDivider]}
              onPress={() => setRoute("legal")}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "legal")}</Text>
                <Text style={styles.rowSubtitle}>
                  {t(locale, "privacyPolicy")}, {t(locale, "termsOfService")}
                </Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
            <Pressable
              style={[styles.listRow, styles.listRowDivider]}
              onPress={() => setRoute("danger")}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "accountActions")}</Text>
                <Text style={styles.rowSubtitle}>
                  {t(locale, "deactivateAccount")}, {t(locale, "deleteAccount")}
                </Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
            <Pressable style={styles.listRow} onPress={onContactSupport}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(locale, "support")}</Text>
                <Text style={styles.rowSubtitle}>{t(locale, "contactSupport")}</Text>
              </View>
              <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "activity")}</Text>
          <View style={styles.statRow}>
            <Text style={styles.sectionBody}>{t(locale, "statsBody")}</Text>
            <Text style={styles.sectionMetaStrong}>0</Text>
          </View>
          <View style={[styles.statRow, styles.subtleTop]}>
            <Text style={styles.sectionBody}>{t(locale, "statsMeta")}</Text>
            <Text style={styles.sectionMetaStrong}>0</Text>
          </View>
          <View style={[styles.statRow, styles.subtleTop]}>
            <Text style={styles.sectionBody}>{t(locale, "sessionsBody")}</Text>
            <Text style={styles.sectionMetaStrong}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
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
    flex: 1,
    gap: theme.spacing.xs
  },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    alignItems: "center"
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
  listGroup: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.6)"
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11, 14, 20, 0.08)"
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  rowSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  detailCard: {
    gap: theme.spacing.sm
  },
  detailTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  detailDivider: {
    height: 1,
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    marginVertical: theme.spacing.sm
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
  sectionMetaStrong: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
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
  footer: {
    marginTop: theme.spacing.lg
  }
});
