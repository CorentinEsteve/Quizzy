import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";

export type NotificationTone = "primary" | "success" | "accent" | "danger";

export type InAppNotification = {
  id: string;
  title: string;
  body?: string;
  tone?: NotificationTone;
  onPress?: () => void;
};

type Props = {
  notification: InAppNotification | null;
  onDismiss: () => void;
};

const toneColors: Record<NotificationTone, string> = {
  primary: theme.colors.primary,
  success: theme.colors.success,
  accent: theme.colors.reward,
  danger: theme.colors.danger
};

export function NotificationBanner({ notification, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = Boolean(notification);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : -24,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 160,
        useNativeDriver: true
      })
    ]).start();
  }, [visible, translateY, opacity]);

  if (!notification) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrapper,
          { paddingTop: insets.top + theme.spacing.sm, opacity, transform: [{ translateY }] }
        ]}
      />
    );
  }

  const tone = notification.tone ?? "primary";
  const accentColor = toneColors[tone];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingTop: insets.top + theme.spacing.sm, opacity, transform: [{ translateY }] }
      ]}
    >
      <Pressable
        onPress={() => {
          notification.onPress?.();
          onDismiss();
        }}
        style={[styles.card, { borderColor: accentColor }]}
      >
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <View style={styles.copy}>
          <Text style={styles.title}>{notification.title}</Text>
          {notification.body ? <Text style={styles.body}>{notification.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    zIndex: 20
  },
  card: {
    width: "100%",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderWidth: 1,
    shadowColor: "rgba(11, 14, 20, 0.18)",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 1
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  body: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  }
});
