import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost";
  tone?: "default" | "danger";
  style?: ViewStyle;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  iconPosition?: "left" | "right";
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  tone = "default",
  style,
  icon,
  iconPosition = "left",
  disabled = false
}: Props) {
  const isDanger = tone === "danger";
  const isGhost = variant === "ghost";
  const iconColor = isGhost
    ? isDanger
      ? theme.colors.danger
      : theme.colors.ink
    : theme.colors.surface;
  const variantStyle = isGhost
    ? {
        backgroundColor: isDanger ? "rgba(235, 87, 87, 0.08)" : "rgba(11, 14, 20, 0.06)",
        borderWidth: 1,
        borderColor: isDanger ? "rgba(235, 87, 87, 0.35)" : "rgba(11, 14, 20, 0.12)"
      }
    : {
        backgroundColor: isDanger ? theme.colors.danger : theme.colors.cta
      };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        (pressed && !disabled) && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconSlot}>
          {icon && iconPosition === "left" ? (
            <FontAwesome name={icon} size={14} color={iconColor} />
          ) : null}
        </View>
        <View style={styles.textSlot}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.text,
              isGhost && styles.textGhost,
              isGhost && isDanger && styles.textGhostDanger,
              disabled && styles.textDisabled
            ]}
          >
            {label}
          </Text>
        </View>
        <View style={styles.iconSlot}>
          {icon && iconPosition === "right" ? (
            <FontAwesome name={icon} size={14} color={iconColor} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 26,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconSlot: {
    width: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  textSlot: {
    flex: 1,
    alignItems: "center",
    minWidth: 0
  },
  text: {
    color: theme.colors.surface,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  textGhost: {
    color: theme.colors.ink
  },
  textGhostDanger: {
    color: theme.colors.danger
  },
  textDisabled: {
    opacity: 0.7
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.5
  }
});
