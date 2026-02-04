import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { theme } from "../theme";

type Props = ViewProps & {
  accent?: string;
};

export function GlassCard({ accent, style, children, ...props }: Props) {
  return (
    <View
      style={[
        styles.card,
        style
      ]}
      {...props}
    >
      {accent ? (
        <View
          pointerEvents="none"
          style={[styles.accentSpot, { backgroundColor: accent }]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#1B1E2B",
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5
  },
  accentSpot: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    top: -90,
    right: -70,
    opacity: 0.14
  }
});
