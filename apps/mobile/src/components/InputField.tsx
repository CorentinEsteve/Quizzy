import React, { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  blurOnSubmit?: boolean;
  dark?: boolean;
};

export const InputField = forwardRef<TextInput, Props>(function InputField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    autoCapitalize = "none",
    keyboardType,
    textContentType,
    autoComplete,
    returnKeyType,
    onSubmitEditing,
    onFocus,
    onBlur,
    blurOnSubmit,
    dark = false
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isSecure = secureTextEntry ?? false;
  const actuallySecure = isSecure && hidden;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          dark && styles.inputWrapperDark,
          focused && (dark ? styles.inputWrapperFocusedDark : styles.inputWrapperFocused)
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, dark && styles.inputDark]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={dark ? "rgba(171, 198, 255, 0.30)" : "#A1A6B3"}
          secureTextEntry={actuallySecure}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
        {isSecure ? (
          <Pressable
            style={styles.eyeButton}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <FontAwesome
              name={hidden ? "eye" : "eye-slash"}
              size={16}
              color={dark ? "rgba(171, 198, 255, 0.45)" : theme.colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
  },
  label: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  labelDark: {
    color: "rgba(171, 198, 255, 0.60)"
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44
  },
  inputWrapperDark: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(171, 198, 255, 0.18)"
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5
  },
  inputWrapperFocusedDark: {
    borderColor: "rgba(94, 124, 255, 0.70)",
    borderWidth: 1.5
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    color: theme.colors.ink
  },
  inputDark: {
    color: "#F3F7FF"
  },
  eyeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center"
  }
});
