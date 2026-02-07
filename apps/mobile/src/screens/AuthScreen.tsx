import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";

export type AuthMode = "login" | "register";

type Props = {
  mode: AuthMode;
  onToggleMode: () => void;
  onSubmit: (payload: {
    email: string;
    password: string;
    displayName?: string;
    locale: Locale;
    country: string;
  }) => void;
  onForgotPassword: (email: string) => void;
  onResetConfirm: (token: string, newPassword: string) => void;
  onReactivate: (email: string, password: string) => void;
  onAppleSignIn?: () => void;
  appleProfileSetup?: {
    displayName?: string;
    country?: "US" | "FR" | "GB" | "CA";
  } | null;
  onSubmitAppleProfile?: (payload: {
    displayName: string;
    country: "US" | "FR" | "GB" | "CA";
    locale: Locale;
  }) => void;
  error?: string | null;
  onClearError?: () => void;
  loading?: boolean;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
};

export function AuthScreen({
  mode,
  onToggleMode,
  onSubmit,
  onForgotPassword,
  onResetConfirm,
  onReactivate,
  onAppleSignIn,
  appleProfileSetup,
  onSubmitAppleProfile,
  error,
  onClearError,
  loading,
  locale,
  onChangeLocale
}: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState<"US" | "FR" | "GB" | "CA">("US");
  const [registerStep, setRegisterStep] = useState(0);
  const [authMethod, setAuthMethod] = useState<"apple" | "email">("apple");
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleAvailabilityResolved, setAppleAvailabilityResolved] = useState(false);
  const [appleProfileName, setAppleProfileName] = useState("");
  const [appleProfileCountry, setAppleProfileCountry] = useState<"US" | "FR" | "GB" | "CA">("US");
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode === "register") {
      setRegisterStep(0);
    }
    setAuthMethod("apple");
  }, [mode]);

  useEffect(() => {
    errorRef.current = error ?? null;
  }, [error]);

  useEffect(() => {
    if (errorRef.current) {
      onClearError?.();
    }
  }, [mode, showReset, onClearError]);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      setAppleAvailable(false);
      setAppleAvailabilityResolved(true);
      return;
    }
    AppleAuthentication.isAvailableAsync()
      .then((available) => setAppleAvailable(available))
      .catch(() => setAppleAvailable(false))
      .finally(() => setAppleAvailabilityResolved(true));
  }, []);

  useEffect(() => {
    if (appleAvailabilityResolved && !appleAvailable) {
      setAuthMethod("email");
    }
  }, [appleAvailabilityResolved, appleAvailable]);

  useEffect(() => {
    if (!appleProfileSetup) return;
    setAppleProfileName(appleProfileSetup.displayName ?? "");
    setAppleProfileCountry(appleProfileSetup.country ?? "US");
  }, [appleProfileSetup]);

  const isEmailValid = useMemo(() => email.trim().includes("@") && email.trim().includes("."), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);
  const isDisplayNameValid = useMemo(() => displayName.trim().length >= 2, [displayName]);
  const isRegisterStepOneValid = isDisplayNameValid && isEmailValid && isPasswordValid;
  const isLoginValid = email.trim().length > 0 && password.length > 0;
  const isRegisterStepTwoValid = true;
  const isAppleProfileNameValid = appleProfileName.trim().length >= 2;

  return (
    <View style={[styles.container, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
      <LinearGradient
        colors={["#F7F8FF", "#FFFFFF", "#F9F2E6"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundOrb} pointerEvents="none" />
      <View style={styles.backgroundOrbAccent} pointerEvents="none" />
      <View style={styles.backgroundGlow} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.keyboardWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{t(locale, "appName")}</Text>
            <Text style={styles.title}>
              {appleProfileSetup
                ? t(locale, "authAppleSetupTitle")
                : mode === "login"
                ? t(locale, "authWelcome")
                : t(locale, "authCreate")}
            </Text>
            <Text style={styles.subtitle}>
              {appleProfileSetup
                ? t(locale, "authAppleSetupBody")
                : mode === "login"
                ? t(locale, "authSignIn")
                : t(locale, "authPickName")}
            </Text>

            {appleProfileSetup ? (
              <>
                <InputField
                  label={t(locale, "displayName")}
                  value={appleProfileName}
                  onChangeText={setAppleProfileName}
                  placeholder="Nova"
                  autoCapitalize="words"
                />
                <Text
                  style={
                    isAppleProfileNameValid || appleProfileName.length === 0
                      ? styles.helperText
                      : styles.helperError
                  }
                >
                  {isAppleProfileNameValid || appleProfileName.length === 0
                    ? t(locale, "authNameHint")
                    : t(locale, "authNameError")}
                </Text>

                <View style={styles.languageRow}>
                  <Text style={styles.languageLabel}>{t(locale, "language")}</Text>
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
                </View>

                <View style={styles.languageRow}>
                  <Text style={styles.languageLabel}>{t(locale, "country")}</Text>
                  <View style={styles.countryGrid}>
                    <Pressable
                      style={[
                        styles.languageOption,
                        appleProfileCountry === "US"
                          ? styles.languageOptionActive
                          : styles.languageOptionIdle
                      ]}
                      onPress={() => setAppleProfileCountry("US")}
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
                          appleProfileCountry === "US"
                            ? styles.languageTextActive
                            : styles.languageTextIdle
                        ]}
                      >
                        {t(locale, "countryUs")}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.languageOption,
                        appleProfileCountry === "FR"
                          ? styles.languageOptionActive
                          : styles.languageOptionIdle
                      ]}
                      onPress={() => setAppleProfileCountry("FR")}
                    >
                      <View style={styles.flagFr}>
                        <View style={[styles.flagFrStripe, styles.flagFrBlue]} />
                        <View style={[styles.flagFrStripe, styles.flagFrWhite]} />
                        <View style={[styles.flagFrStripe, styles.flagFrRed]} />
                      </View>
                      <Text
                        style={[
                          styles.languageText,
                          appleProfileCountry === "FR"
                            ? styles.languageTextActive
                            : styles.languageTextIdle
                        ]}
                      >
                        {t(locale, "countryFr")}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.languageOption,
                        appleProfileCountry === "GB"
                          ? styles.languageOptionActive
                          : styles.languageOptionIdle
                      ]}
                      onPress={() => setAppleProfileCountry("GB")}
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
                          appleProfileCountry === "GB"
                            ? styles.languageTextActive
                            : styles.languageTextIdle
                        ]}
                      >
                        {t(locale, "countryGb")}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.languageOption,
                        appleProfileCountry === "CA"
                          ? styles.languageOptionActive
                          : styles.languageOptionIdle
                      ]}
                      onPress={() => setAppleProfileCountry("CA")}
                    >
                      <View style={styles.flagCa}>
                        <View style={[styles.flagCaStripe, styles.flagCaRed]} />
                        <View style={[styles.flagCaStripe, styles.flagCaWhite]} />
                        <View style={[styles.flagCaStripe, styles.flagCaRed]} />
                      </View>
                      <Text
                        style={[
                          styles.languageText,
                          appleProfileCountry === "CA"
                            ? styles.languageTextActive
                            : styles.languageTextIdle
                        ]}
                      >
                        {t(locale, "countryCa")}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label={loading ? t(locale, "pleaseWait") : t(locale, "authAppleSetupDone")}
                  icon="arrow-right"
                  iconPosition="right"
                  onPress={() =>
                    onSubmitAppleProfile?.({
                      displayName: appleProfileName.trim(),
                      country: appleProfileCountry,
                      locale
                    })
                  }
                  disabled={!isAppleProfileNameValid || loading}
                />
              </>
            ) : null}

            {!appleProfileSetup && mode === "register" && registerStep === 1 ? (
              <Pressable style={styles.backInline} onPress={() => setRegisterStep(0)}>
                <FontAwesome name="arrow-left" size={14} color={theme.colors.muted} />
                <Text style={styles.backInlineText}>{t(locale, "back")}</Text>
              </Pressable>
            ) : null}

            {appleAvailable &&
            !showReset &&
            !appleProfileSetup &&
            authMethod === "apple" &&
            (mode === "login" || registerStep === 0) ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.appleButton,
                    pressed && styles.appleButtonPressed,
                    loading && styles.appleButtonDisabled
                  ]}
                  onPress={() => {
                    if (loading) return;
                    onAppleSignIn?.();
                  }}
                >
                  <FontAwesome name="apple" size={20} color="#FFFFFF" />
                  <Text style={styles.appleButtonText}>{t(locale, "authAppleAction")}</Text>
                </Pressable>
                <PrimaryButton
                  label={t(locale, "authUseEmail")}
                  variant="ghost"
                  onPress={() => setAuthMethod("email")}
                />
              </>
            ) : null}

            {!appleProfileSetup &&
            authMethod === "email" &&
            !showReset &&
            (mode === "login" || registerStep === 0) ? (
              <Pressable style={styles.backInline} onPress={() => setAuthMethod("apple")}>
                <FontAwesome name="arrow-left" size={14} color={theme.colors.muted} />
                <Text style={styles.backInlineText}>{t(locale, "authBackToMethods")}</Text>
              </Pressable>
            ) : null}

            {!appleProfileSetup && mode === "register" && registerStep === 0 && authMethod === "email" ? (
              <>
                <InputField
                  label={t(locale, "displayName")}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Nova"
                  autoCapitalize="words"
                />
                <Text style={isDisplayNameValid || displayName.length === 0 ? styles.helperText : styles.helperError}>
                  {isDisplayNameValid || displayName.length === 0
                    ? t(locale, "authNameHint")
                    : t(locale, "authNameError")}
                </Text>
                <InputField
                  label={t(locale, "email")}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@studio.com"
                />
                <Text style={isEmailValid || email.length === 0 ? styles.helperText : styles.helperError}>
                  {isEmailValid || email.length === 0
                    ? t(locale, "authEmailHint")
                    : t(locale, "authEmailError")}
                </Text>
                <InputField
                  label={t(locale, "password")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="********"
                  secureTextEntry
                />
                <Text style={isPasswordValid || password.length === 0 ? styles.helperText : styles.helperError}>
                  {isPasswordValid || password.length === 0
                    ? t(locale, "authPasswordHint")
                    : t(locale, "authPasswordError")}
                </Text>
              </>
            ) : null}

            {!appleProfileSetup && mode === "login" && !showReset && authMethod === "email" ? (
              <>
                <InputField
                  label={t(locale, "email")}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@studio.com"
                />
                <InputField
                  label={t(locale, "password")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="********"
                  secureTextEntry
                />
                <Pressable
                  style={styles.forgotLink}
                  onPress={() => {
                    setResetEmail(email);
                    setShowReset(true);
                    setAuthMethod("email");
                  }}
                >
                  <FontAwesome name="unlock-alt" size={12} color={theme.colors.muted} />
                  <Text style={styles.forgotLinkText}>{t(locale, "forgotPassword")}</Text>
                </Pressable>
              </>
            ) : null}

            {!appleProfileSetup && mode === "login" && showReset ? (
              <>
                <Text style={styles.subtitle}>{t(locale, "resetPasswordBody")}</Text>
                <InputField
                  label={t(locale, "email")}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="you@studio.com"
                />
                <View style={styles.resetActions}>
                  <PrimaryButton
                    label={t(locale, "sendResetLink")}
                    variant="primary"
                    onPress={() => onForgotPassword(resetEmail)}
                    style={styles.resetPrimaryButton}
                  />
                  <PrimaryButton
                    label={t(locale, "cancel")}
                    variant="ghost"
                    onPress={() => setShowReset(false)}
                    style={styles.resetGhostButton}
                  />
                </View>
                <Pressable
                  style={styles.inlineLink}
                  onPress={() => setShowResetConfirm((prev) => !prev)}
                >
                  <Text style={styles.inlineLinkText}>{t(locale, "haveResetCode")}</Text>
                </Pressable>
                {showResetConfirm ? (
                  <>
                    <InputField
                      label={t(locale, "resetCode")}
                      value={resetToken}
                      onChangeText={setResetToken}
                      placeholder="ABC123"
                      autoCapitalize="none"
                    />
                    <InputField
                      label={t(locale, "newPassword")}
                      value={resetNewPassword}
                      onChangeText={setResetNewPassword}
                      placeholder="********"
                      secureTextEntry
                    />
                    <InputField
                      label={t(locale, "confirmPassword")}
                      value={resetConfirmPassword}
                      onChangeText={setResetConfirmPassword}
                      placeholder="********"
                      secureTextEntry
                    />
                    {resetError ? <Text style={styles.error}>{resetError}</Text> : null}
                    <PrimaryButton
                      label={t(locale, "resetNow")}
                      variant="primary"
                      onPress={() => {
                        if (!resetToken.trim()) {
                          setResetError(t(locale, "resetCodeError"));
                          return;
                        }
                        if (resetNewPassword.length < 8) {
                          setResetError(t(locale, "passwordTooShort"));
                          return;
                        }
                        if (resetNewPassword !== resetConfirmPassword) {
                          setResetError(t(locale, "passwordMismatch"));
                          return;
                        }
                        setResetError(null);
                        onResetConfirm(resetToken, resetNewPassword);
                      }}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {!appleProfileSetup && mode === "register" && registerStep === 1 && (
              <View style={styles.languageRow}>
                <Text style={styles.languageLabel}>{t(locale, "language")}</Text>
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
              </View>
            )}

            {!appleProfileSetup && mode === "register" && registerStep === 1 && (
              <View style={styles.languageRow}>
                <Text style={styles.languageLabel}>{t(locale, "country")}</Text>
                <View style={styles.countryGrid}>
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
              </View>
            )}

            {!appleProfileSetup && error ? <Text style={styles.error}>{error}</Text> : null}

            {!appleProfileSetup && mode === "login" && !showReset && authMethod === "email" ? (
              <PrimaryButton
                label={loading ? t(locale, "pleaseWait") : t(locale, "signIn")}
                icon="sign-in"
                iconPosition="right"
                onPress={() => onSubmit({ email, password, displayName, locale, country })}
                disabled={!isLoginValid || loading}
              />
            ) : mode === "login" && showReset ? null : registerStep === 0 && authMethod === "email" ? (
              <PrimaryButton
                label={t(locale, "continue")}
                icon="arrow-right"
                iconPosition="right"
                onPress={() => setRegisterStep(1)}
                disabled={!isRegisterStepOneValid}
              />
            ) : registerStep === 1 ? (
              <PrimaryButton
                label={loading ? t(locale, "pleaseWait") : t(locale, "createAccount")}
                icon="user-plus"
                iconPosition="right"
                onPress={() => onSubmit({ email, password, displayName, locale, country })}
                disabled={!isRegisterStepTwoValid || loading}
              />
            ) : null}

            {!appleProfileSetup ? (
              <Pressable onPress={onToggleMode} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>
                  {mode === "login" ? t(locale, "needAccount") : t(locale, "haveAccount")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: "center"
  },
  keyboardWrapper: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: theme.spacing.xl
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    shadowColor: "#1C2A4A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  backgroundOrb: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(94, 124, 255, 0.14)"
  },
  backgroundOrbAccent: {
    position: "absolute",
    bottom: -120,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(243, 183, 78, 0.16)"
  },
  backgroundGlow: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255, 255, 255, 0.7)"
  },
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.2
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
  progressLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  backInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start"
  },
  backInlineText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  helperText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  helperError: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  switchLink: {
    alignSelf: "center",
    paddingVertical: theme.spacing.xs
  },
  switchLinkText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  inlineLink: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs
  },
  inlineLinkText: {
    color: theme.colors.accent,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  forgotLink: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)",
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    minHeight: 32
  },
  forgotLinkText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "600"
  },
  resetActions: {
    flexDirection: "column",
    gap: theme.spacing.sm,
    alignItems: "stretch"
  },
  resetPrimaryButton: {
    alignSelf: "stretch"
  },
  resetGhostButton: {
    alignSelf: "stretch"
  },
  appleButton: {
    minHeight: 46,
    borderRadius: 999,
    marginTop: theme.spacing.xs,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md
  },
  appleButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  appleButtonDisabled: {
    opacity: 0.6
  },
  appleButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  languageRow: {
    gap: theme.spacing.xs
  },
  languageLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  languageButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  countryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44
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
  }
});
