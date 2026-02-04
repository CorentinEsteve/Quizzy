import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

type Props = {
  label: string;
  tone?: "default" | "success";
};

export function Pill({ label, tone = "default" }: Props) {
  return (
    <View style={[styles.base, tone === "success" && styles.success]}>
      <Text style={[styles.text, tone === "success" && styles.textSuccess]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)"
  },
  success: {
    backgroundColor: "rgba(43, 158, 102, 0.12)"
  },
  text: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  textSuccess: {
    color: theme.colors.success
  }
});
