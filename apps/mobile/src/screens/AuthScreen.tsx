import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { StarfieldBackground } from "../components/StarfieldBackground";

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

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState<"US" | "FR" | "GB" | "CA">("US");
  const [registerStep, setRegisterStep] = useState(0);
  const [authMethod, setAuthMethod] = useState<"apple" | "email">("apple");
  const [resetSubMode, setResetSubMode] = useState<"request" | "confirm">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  // Apple state
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleAvailabilityResolved, setAppleAvailabilityResolved] = useState(false);
  const [appleProfileName, setAppleProfileName] = useState("");
  const [appleProfileCountry, setAppleProfileCountry] = useState<"US" | "FR" | "GB" | "CA">("US");

  // Error tracking ref for cleanup
  const errorRef = useRef<string | null>(null);

  // Animation values
  const cardAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Input refs for keyboard chaining
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const displayNameRef = useRef<TextInput>(null);
  const registerEmailRef = useRef<TextInput>(null);
  const registerPasswordRef = useRef<TextInput>(null);
  const resetEmailRef = useRef<TextInput>(null);
  const resetTokenRef = useRef<TextInput>(null);
  const resetNewPasswordRef = useRef<TextInput>(null);
  const resetConfirmPasswordRef = useRef<TextInput>(null);
  const appleProfileNameRef = useRef<TextInput>(null);

  // --- Effects ---

  useEffect(() => {
    if (mode === "register") setRegisterStep(0);
    setAuthMethod("apple");
    setShowReset(false);
    runCardEntry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    errorRef.current = error ?? null;
  }, [error]);

  useEffect(() => {
    if (errorRef.current) onClearError?.();
  }, [mode, showReset, onClearError]);

  // Shake on new error
  useEffect(() => {
    if (error) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 7, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start();
    }
  }, [error, shakeAnim]);

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
    if (appleAvailabilityResolved && !appleAvailable) setAuthMethod("email");
  }, [appleAvailabilityResolved, appleAvailable]);

  useEffect(() => {
    if (!appleProfileSetup) return;
    setAppleProfileName(appleProfileSetup.displayName ?? "");
    setAppleProfileCountry(appleProfileSetup.country ?? "US");
  }, [appleProfileSetup]);

  // Entry animation on mount
  useEffect(() => {
    runCardEntry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Helpers ---

  function runCardEntry() {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }

  function advanceToStep2() {
    Animated.timing(stepAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setRegisterStep(1);
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }).start();
    });
  }

  function goBackToStep1() {
    Animated.timing(stepAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setRegisterStep(0);
      stepAnim.setValue(0);
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }).start();
    });
  }

  // --- Validation ---

  const isEmailValid = useMemo(() => email.trim().includes("@") && email.trim().includes("."), [email]);
  const isPasswordValid = useMemo(() => password.length >= 8, [password]);
  const isDisplayNameValid = useMemo(() => displayName.trim().length >= 2, [displayName]);
  const isRegisterStepOneValid = isDisplayNameValid && isEmailValid && isPasswordValid;
  const isLoginValid = email.trim().length > 0 && password.length > 0;
  const isAppleProfileNameValid = appleProfileName.trim().length >= 2;

  // --- Error display ---

  function resolveError(raw: string | null | undefined): string | null {
    if (!raw) return null;
    if (raw.toLowerCase().includes("too many")) return t(locale, "tooManyRequests");
    return raw;
  }

  const isDeactivated = !!error && error.toLowerCase().includes("deactivated");
  const displayedError = isDeactivated ? null : resolveError(error);

  // --- Header text ---

  function getTitle(): string {
    if (appleProfileSetup) return t(locale, "authAppleSetupTitle");
    if (mode === "login") {
      if (showReset) return t(locale, "resetPassword");
      return t(locale, "authWelcome");
    }
    return registerStep === 1 ? t(locale, "authStepPreferences") : t(locale, "authCreate");
  }

  function getSubtitle(): string {
    if (appleProfileSetup) return t(locale, "authAppleSetupBody");
    if (mode === "login") {
      if (showReset) return t(locale, "resetPasswordBody");
      return t(locale, "authSignIn");
    }
    return registerStep === 1 ? t(locale, "authStepPreferencesBody") : t(locale, "authPickName");
  }

  // --- Animated styles ---

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [36, 0]
        })
      }
    ]
  };

  const stepStyle = {
    opacity: stepAnim,
    transform: [
      {
        translateX: stepAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0]
        })
      }
    ]
  };

  // --- Flag components ---

  const FlagUK = () => (
    <View style={styles.flagUk}>
      <View style={styles.flagUkWhiteHorizontal} />
      <View style={styles.flagUkWhiteVertical} />
      <View style={styles.flagUkRedHorizontal} />
      <View style={styles.flagUkRedVertical} />
    </View>
  );

  const FlagFR = () => (
    <View style={styles.flagFr}>
      <View style={[styles.flagFrStripe, styles.flagFrBlue]} />
      <View style={[styles.flagFrStripe, styles.flagFrWhite]} />
      <View style={[styles.flagFrStripe, styles.flagFrRed]} />
    </View>
  );

  const FlagUS = () => (
    <View style={styles.flagUs}>
      <View style={styles.flagUsStars} />
      <View style={styles.flagUsStripe} />
      <View style={[styles.flagUsStripe, styles.flagUsStripeAlt]} />
      <View style={[styles.flagUsStripe, styles.flagUsStripe3]} />
    </View>
  );

  const FlagCA = () => (
    <View style={styles.flagCa}>
      <View style={[styles.flagCaStripe, styles.flagCaRed]} />
      <View style={[styles.flagCaStripe, styles.flagCaWhite]} />
      <View style={[styles.flagCaStripe, styles.flagCaRed]} />
    </View>
  );

  // --- Language / country selectors ---

  function LanguageSelector({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
    return (
      <View style={styles.selectorRow}>
        <Text style={styles.selectorLabel}>{t(locale, "language")}</Text>
        <View style={styles.languageButtons}>
          {(["en", "fr"] as Locale[]).map((l) => {
            const active = value === l;
            return (
              <Pressable
                key={l}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                onPress={() => onChange(l)}
              >
                {l === "en" ? <FlagUK /> : <FlagFR />}
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
                  {t(locale, l === "en" ? "english" : "french")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function CountrySelector({
    value,
    onChange
  }: {
    value: "US" | "FR" | "GB" | "CA";
    onChange: (c: "US" | "FR" | "GB" | "CA") => void;
  }) {
    const options: Array<{ code: "US" | "FR" | "GB" | "CA"; labelKey: "countryUs" | "countryFr" | "countryGb" | "countryCa" }> = [
      { code: "US", labelKey: "countryUs" },
      { code: "FR", labelKey: "countryFr" },
      { code: "GB", labelKey: "countryGb" },
      { code: "CA", labelKey: "countryCa" }
    ];
    const flagMap: Record<string, React.ReactElement> = {
      US: <FlagUS />,
      FR: <FlagFR />,
      GB: <FlagUK />,
      CA: <FlagCA />
    };
    return (
      <View style={styles.selectorRow}>
        <Text style={styles.selectorLabel}>{t(locale, "country")}</Text>
        <View style={styles.countryGrid}>
          {options.map(({ code, labelKey }) => {
            const active = value === code;
            return (
              <Pressable
                key={code}
                style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                onPress={() => onChange(code)}
              >
                {flagMap[code]}
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
                  {t(locale, labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // --- Progress dots ---

  function ProgressDots({ current, total }: { current: number; total: number }) {
    return (
      <View style={styles.progressDots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i === current ? styles.progressDotActive : styles.progressDotIdle]}
          />
        ))}
      </View>
    );
  }

  return (
    <Pressable style={styles.outerPressable} onPress={() => Keyboard.dismiss()} accessible={false}>
      {/* Dark starfield background — matches Lobby & Splash */}
      <StarfieldBackground />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: theme.spacing.lg + insets.top, paddingBottom: theme.spacing.lg + insets.bottom }
        ]}
      >
          <Animated.View style={[styles.card, cardStyle]}>
            {/* Inner glow overlay */}
            <LinearGradient
              colors={["rgba(94, 124, 255, 0.07)", "transparent"]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Card header: back button (top-left) + logo (centered) */}
            <View style={styles.cardHeader}>
              {!appleProfileSetup &&
              authMethod === "email" &&
              !showReset &&
              appleAvailable &&
              (mode === "login" || registerStep === 0) ? (
                <Pressable
                  style={({ pressed }) => [styles.backIconButton, pressed && styles.backIconButtonPressed]}
                  onPress={() => setAuthMethod("apple")}
                  hitSlop={8}
                >
                  <FontAwesome name="chevron-left" size={11} color="rgba(171, 198, 255, 0.55)" />
                  <FontAwesome name="apple" size={13} color="rgba(171, 198, 255, 0.45)" />
                </Pressable>
              ) : (
                <View style={styles.cardHeaderSpacer} />
              )}
              <View style={styles.logoCard}>
                <Image
                  source={require("../../assets/logo-big.png")}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.cardHeaderSpacer} />
            </View>

            {/* Header */}
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>

            {/* Progress dots for register steps */}
            {!appleProfileSetup && mode === "register" && authMethod === "email" ? (
              <ProgressDots current={registerStep} total={2} />
            ) : null}

            {/* ── Apple Profile Setup ── */}
            {appleProfileSetup ? (
              <>
                <InputField
                  ref={appleProfileNameRef}
                  label={t(locale, "displayName")}
                  value={appleProfileName}
                  onChangeText={setAppleProfileName}
                  placeholder="Nova"
                  autoCapitalize="words"
                  textContentType="name"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  dark
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

                <LanguageSelector value={locale} onChange={onChangeLocale} />
                <CountrySelector value={appleProfileCountry} onChange={setAppleProfileCountry} />

                {error ? (
                  <Animated.View style={[styles.errorRow, { transform: [{ translateX: shakeAnim }] }]}>
                    <FontAwesome name="exclamation-circle" size={14} color={theme.colors.danger} />
                    <Text style={styles.error}>{resolveError(error)}</Text>
                  </Animated.View>
                ) : null}

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
                {loading ? <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} /> : null}
              </>
            ) : null}

            {/* ── Back: register step 2 ── */}
            {!appleProfileSetup && mode === "register" && registerStep === 1 ? (
              <Pressable style={styles.backInline} onPress={goBackToStep1}>
                <FontAwesome name="arrow-left" size={13} color="rgba(171, 198, 255, 0.55)" />
                <Text style={styles.backInlineText}>{t(locale, "back")}</Text>
              </Pressable>
            ) : null}

            {/* ── Back: reset confirm sub-mode ── */}
            {!appleProfileSetup && mode === "login" && showReset && resetSubMode === "confirm" ? (
              <Pressable style={styles.backInline} onPress={() => setResetSubMode("request")}>
                <FontAwesome name="arrow-left" size={13} color="rgba(171, 198, 255, 0.55)" />
                <Text style={styles.backInlineText}>{t(locale, "back")}</Text>
              </Pressable>
            ) : null}

            {/* ── Apple button ── */}
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
                  dark
                  onPress={() => setAuthMethod("email")}
                />
              </>
            ) : null}

            {/* ── Register step 0: account details ── */}
            {!appleProfileSetup && mode === "register" && registerStep === 0 && authMethod === "email" ? (
              <Animated.View style={[styles.stepContent, stepStyle]}>
                <InputField
                  ref={displayNameRef}
                  label={t(locale, "displayName")}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Nova"
                  autoCapitalize="words"
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => registerEmailRef.current?.focus()}
                  blurOnSubmit={false}
                  dark
                />
                <Text style={isDisplayNameValid || displayName.length === 0 ? styles.helperText : styles.helperError}>
                  {isDisplayNameValid || displayName.length === 0
                    ? t(locale, "authNameHint")
                    : t(locale, "authNameError")}
                </Text>
                <InputField
                  ref={registerEmailRef}
                  label={t(locale, "email")}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@studio.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => registerPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  dark
                />
                <Text style={isEmailValid || email.length === 0 ? styles.helperText : styles.helperError}>
                  {isEmailValid || email.length === 0 ? t(locale, "authEmailHint") : t(locale, "authEmailError")}
                </Text>
                <InputField
                  ref={registerPasswordRef}
                  label={t(locale, "password")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (isRegisterStepOneValid) advanceToStep2();
                    else Keyboard.dismiss();
                  }}
                  dark
                />
                <Text style={isPasswordValid || password.length === 0 ? styles.helperText : styles.helperError}>
                  {isPasswordValid || password.length === 0
                    ? t(locale, "authPasswordHint")
                    : t(locale, "authPasswordError")}
                </Text>
              </Animated.View>
            ) : null}

            {/* ── Login: email form ── */}
            {!appleProfileSetup && mode === "login" && !showReset && authMethod === "email" ? (
              <>
                <InputField
                  ref={emailRef}
                  label={t(locale, "email")}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@studio.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  dark
                />
                <InputField
                  ref={passwordRef}
                  label={t(locale, "password")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  secureTextEntry
                  textContentType="password"
                  autoComplete="current-password"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (isLoginValid) onSubmit({ email, password, displayName, locale, country });
                    else Keyboard.dismiss();
                  }}
                  dark
                />
                <Pressable
                  style={styles.forgotLink}
                  onPress={() => {
                    setResetEmail(email);
                    setResetSubMode("request");
                    setShowReset(true);
                    setAuthMethod("email");
                  }}
                >
                  <FontAwesome name="unlock-alt" size={12} color="rgba(171, 198, 255, 0.50)" />
                  <Text style={styles.forgotLinkText}>{t(locale, "forgotPassword")}</Text>
                </Pressable>
              </>
            ) : null}

            {/* ── Password reset: request ── */}
            {!appleProfileSetup && mode === "login" && showReset && resetSubMode === "request" ? (
              <>
                <InputField
                  ref={resetEmailRef}
                  label={t(locale, "email")}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  placeholder="you@studio.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={() => onForgotPassword(resetEmail)}
                  dark
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
                    dark
                    onPress={() => setShowReset(false)}
                    style={styles.resetGhostButton}
                  />
                </View>
                <Pressable style={styles.inlineLink} onPress={() => setResetSubMode("confirm")}>
                  <Text style={styles.inlineLinkText}>{t(locale, "haveResetCode")}</Text>
                </Pressable>
              </>
            ) : null}

            {/* ── Password reset: confirm ── */}
            {!appleProfileSetup && mode === "login" && showReset && resetSubMode === "confirm" ? (
              <>
                <InputField
                  ref={resetTokenRef}
                  label={t(locale, "resetCode")}
                  value={resetToken}
                  onChangeText={setResetToken}
                  placeholder="ABC123"
                  autoCapitalize="none"
                  textContentType="oneTimeCode"
                  returnKeyType="next"
                  onSubmitEditing={() => resetNewPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  dark
                />
                <InputField
                  ref={resetNewPasswordRef}
                  label={t(locale, "newPassword")}
                  value={resetNewPassword}
                  onChangeText={setResetNewPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => resetConfirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  dark
                />
                <InputField
                  ref={resetConfirmPasswordRef}
                  label={t(locale, "confirmPassword")}
                  value={resetConfirmPassword}
                  onChangeText={setResetConfirmPassword}
                  placeholder="Repeat password"
                  secureTextEntry
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  dark
                />
                {resetError ? (
                  <Animated.View style={[styles.errorRow, { transform: [{ translateX: shakeAnim }] }]}>
                    <FontAwesome name="exclamation-circle" size={14} color={theme.colors.danger} />
                    <Text style={styles.error}>{resetError}</Text>
                  </Animated.View>
                ) : null}
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

            {/* ── Register step 1: preferences ── */}
            {!appleProfileSetup && mode === "register" && registerStep === 1 ? (
              <Animated.View style={[styles.stepContent, stepStyle]}>
                <LanguageSelector value={locale} onChange={onChangeLocale} />
                <CountrySelector value={country} onChange={setCountry} />
              </Animated.View>
            ) : null}

            {/* ── Global error ── */}
            {!appleProfileSetup && displayedError ? (
              <Animated.View style={[styles.errorRow, { transform: [{ translateX: shakeAnim }] }]}>
                <FontAwesome name="exclamation-circle" size={14} color={theme.colors.danger} />
                <Text style={styles.error}>{displayedError}</Text>
              </Animated.View>
            ) : null}

            {/* ── Account deactivated panel ── */}
            {!appleProfileSetup && isDeactivated ? (
              <Animated.View style={[styles.deactivatedPanel, { transform: [{ translateX: shakeAnim }] }]}>
                <View style={styles.deactivatedHeader}>
                  <FontAwesome name="pause-circle" size={15} color="rgba(171, 198, 255, 0.55)" />
                  <Text style={styles.deactivatedText}>{t(locale, "accountDeactivated")}</Text>
                </View>
                <PrimaryButton
                  label={t(locale, "reactivateAccount")}
                  variant="ghost"
                  dark
                  onPress={() => onReactivate(email, password)}
                  disabled={loading}
                />
              </Animated.View>
            ) : null}

            {/* ── Submit buttons ── */}
            {!appleProfileSetup && mode === "login" && !showReset && authMethod === "email" ? (
              <>
                <PrimaryButton
                  label={loading ? t(locale, "pleaseWait") : t(locale, "signIn")}
                  icon="sign-in"
                  iconPosition="right"
                  onPress={() => onSubmit({ email, password, displayName, locale, country })}
                  disabled={!isLoginValid || loading}
                />
                {loading ? <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} /> : null}
              </>
            ) : mode === "login" && showReset ? null
              : !appleProfileSetup && registerStep === 0 && authMethod === "email" ? (
              <PrimaryButton
                label={t(locale, "continue")}
                icon="arrow-right"
                iconPosition="right"
                onPress={advanceToStep2}
                disabled={!isRegisterStepOneValid}
              />
            ) : !appleProfileSetup && registerStep === 1 ? (
              <>
                <PrimaryButton
                  label={loading ? t(locale, "pleaseWait") : t(locale, "createAccount")}
                  icon="user-plus"
                  iconPosition="right"
                  onPress={() => onSubmit({ email, password, displayName, locale, country })}
                  disabled={loading}
                />
                {loading ? <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} /> : null}
              </>
            ) : null}

            {/* ── Toggle login / register ── */}
            {!appleProfileSetup ? (
              <Pressable onPress={onToggleMode} style={styles.switchLink}>
                <Text style={styles.switchLinkText}>
                  {mode === "login" ? t(locale, "needAccount") : t(locale, "haveAccount")}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outerPressable: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background
  },
  scrollView: {
    backgroundColor: "transparent"
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center"
  },

  // Glass card on dark background
  card: {
    backgroundColor: "rgba(10, 18, 52, 0.84)",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.13)",
    gap: theme.spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 }
  },

  // Card header row (back button + centered logo)
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardHeaderSpacer: {
    width: 44
  },
  logoCard: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: "rgba(214, 228, 255, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(171, 198, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  logoImage: {
    width: "130%",
    height: "130%"
  },

  // Typography
  title: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  subtitle: {
    color: "rgba(171, 198, 255, 0.65)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },

  // Progress dots
  progressDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center"
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary
  },
  progressDotIdle: {
    backgroundColor: "rgba(171, 198, 255, 0.22)"
  },

  stepContent: {
    gap: theme.spacing.md
  },

  // Back to Apple methods — icon only
  backIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(171, 198, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.12)"
  },
  backIconButtonPressed: {
    backgroundColor: "rgba(171, 198, 255, 0.13)"
  },

  // Navigation
  backInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start"
  },
  backInlineText: {
    color: "rgba(171, 198, 255, 0.55)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },

  // Errors
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    flex: 1
  },
  helperText: {
    color: "rgba(171, 198, 255, 0.45)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  helperError: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },

  // Deactivated panel
  deactivatedPanel: {
    backgroundColor: "rgba(171, 198, 255, 0.05)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.12)",
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  deactivatedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  deactivatedText: {
    color: "rgba(171, 198, 255, 0.60)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },

  spinner: {
    alignSelf: "center"
  },

  // Login ↔ register toggle
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

  // "I have a reset code"
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

  // Forgot password pill
  forgotLink: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.14)",
    backgroundColor: "rgba(171, 198, 255, 0.06)",
    minHeight: 32
  },
  forgotLinkText: {
    color: "rgba(171, 198, 255, 0.70)",
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    fontWeight: "600"
  },

  // Password reset actions
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

  // Apple button
  appleButton: {
    minHeight: 46,
    borderRadius: 999,
    marginTop: theme.spacing.xs,
    backgroundColor: "#000000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)"
  },
  appleButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }]
  },
  appleButtonDisabled: {
    opacity: 0.5
  },
  appleButtonText: {
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },

  // Language / country selectors
  selectorRow: {
    gap: theme.spacing.xs
  },
  selectorLabel: {
    color: "rgba(171, 198, 255, 0.55)",
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  chipIdle: {
    backgroundColor: "rgba(171, 198, 255, 0.07)",
    borderColor: "rgba(171, 198, 255, 0.18)"
  },
  chipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  chipTextIdle: {
    color: "rgba(171, 198, 255, 0.80)"
  },

  // Flags
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
