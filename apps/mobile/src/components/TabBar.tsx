import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";
import { Locale, t } from "../i18n";

type TabKey = "lobby" | "social" | "create" | "historique" | "leaderboard";

type Props = {
  activeTab: "lobby" | "social" | "historique" | "leaderboard";
  onPress: (tab: TabKey) => void;
  locale: Locale;
};

const TABS: { key: TabKey; icon: string; labelKey?: "tabHome" | "tabSocial" | "tabHistory" | "tabLeaderboard" }[] = [
  { key: "lobby", icon: "home", labelKey: "tabHome" },
  { key: "social", icon: "users", labelKey: "tabSocial" },
  { key: "create", icon: "bolt" },
  { key: "historique", icon: "gamepad", labelKey: "tabHistory" },
  { key: "leaderboard", icon: "trophy", labelKey: "tabLeaderboard" },
];

function TabItem({
  tabKey,
  icon,
  labelKey,
  isActive,
  onPress,
  locale,
}: {
  tabKey: TabKey;
  icon: string;
  labelKey?: "tabHome" | "tabSocial" | "tabHistory" | "tabLeaderboard";
  isActive: boolean;
  onPress: () => void;
  locale: Locale;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(94,124,255,0)", "rgba(94,124,255,0.32)"],
  });
  const borderColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(140,165,255,0)", "rgba(140,165,255,0.35)"],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={6}
      style={styles.tabWrapper}
    >
      <Animated.View
        style={[
          styles.tabInner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Animated.View
          style={[styles.activeIndicator, { backgroundColor: bgColor, borderColor }]}
        />
        <FontAwesome
          name={icon as any}
          size={isActive ? 21 : 19}
          color={isActive ? "#FFFFFF" : "rgba(255,255,255,0.40)"}
        />
        {labelKey && (
          <Text style={[styles.label, isActive && styles.labelActive]}>
            {t(locale, labelKey)}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function CreateTabItem({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={4}
      style={styles.tabWrapper}
    >
      <Animated.View
        style={[styles.createButton, { transform: [{ scale: scaleAnim }] }]}
      >
        <FontAwesome name="bolt" size={22} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ activeTab, onPress, locale }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom - 14, 4) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {TABS.map((tab) => {
          if (tab.key === "create") {
            return (
              <CreateTabItem
                key={tab.key}
                onPress={() => onPress("create")}
              />
            );
          }
          return (
            <TabItem
              key={tab.key}
              tabKey={tab.key}
              icon={tab.icon}
              labelKey={tab.labelKey}
              isActive={tab.key === activeTab}
              onPress={() => onPress(tab.key)}
              locale={locale}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    // Dark enough to stay readable over white cards, light enough to show glass depth
    backgroundColor: "rgba(10, 15, 50, 0.74)",
    borderRadius: 32,
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 18,
  },
  tabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 58,
    gap: 4,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    width: 68,
    height: 54,
    gap: 4,
  },
  activeIndicator: {
    position: "absolute",
    width: 68,
    height: 54,
    borderRadius: 28,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.1,
  },
  labelActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  createButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.cta,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.40)",
    shadowColor: theme.colors.primary,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 20,
    // Overflow above and below the pill
    marginVertical: -16,
  },
});
