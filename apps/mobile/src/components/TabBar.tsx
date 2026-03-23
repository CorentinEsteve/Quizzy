import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";
import { Locale, t } from "../i18n";

const TAB_HEIGHT = 60;

type TabKey = "lobby" | "social" | "create" | "historique" | "leaderboard";

type Props = {
  activeTab: "lobby" | "social" | "historique" | "leaderboard";
  onPress: (tab: TabKey) => void;
  locale: Locale;
};

const TABS: { key: TabKey; icon: string; labelKey?: "tabHome" | "tabSocial" | "tabHistory" | "tabLeaderboard" }[] = [
  { key: "lobby", icon: "home", labelKey: "tabHome" },
  { key: "social", icon: "users", labelKey: "tabSocial" },
  { key: "create", icon: "plus" },
  { key: "historique", icon: "clock-o", labelKey: "tabHistory" },
  { key: "leaderboard", icon: "trophy", labelKey: "tabLeaderboard" },
];

export function TabBar({ activeTab, onPress, locale }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        if (tab.key === "create") {
          return (
            <Pressable
              key={tab.key}
              onPress={() => onPress("create")}
              style={styles.tab}
              hitSlop={8}
            >
              <View style={styles.createButton}>
                <FontAwesome name="plus" size={22} color="#FFFFFF" />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.key}
            onPress={() => onPress(tab.key)}
            style={styles.tab}
            hitSlop={4}
          >
            <FontAwesome
              name={tab.icon as any}
              size={20}
              color={isActive ? theme.colors.primary : theme.colors.muted}
            />
            {tab.labelKey && (
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {t(locale, tab.labelKey)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D1640",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_HEIGHT,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.cta,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 4,
  },
});
