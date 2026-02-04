import React, { useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, View, useWindowDimensions } from "react-native";

type Props = {
  enabled: boolean;
  onBack: () => void;
  children: React.ReactNode;
};

const EDGE_WIDTH = 36;
const THRESHOLD_RATIO = 0.25;
const VELOCITY_THRESHOLD = 700;

export function EdgeSwipeBack({ enabled, onBack, children }: Props) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const finishBack = (target: number) => {
    isAnimatingRef.current = true;
    Animated.timing(translateX, {
      toValue: target,
      duration: 180,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) onBack();
      isAnimatingRef.current = false;
    });
  };

  const cancelBack = (velocityX: number) => {
    isAnimatingRef.current = true;
    Animated.spring(translateX, {
      toValue: 0,
      velocity: velocityX,
      stiffness: 240,
      damping: 26,
      mass: 1,
      overshootClamping: true,
      useNativeDriver: true
    }).start(() => {
      isAnimatingRef.current = false;
    });
  };

  const createPanResponder = (direction: "left" | "right") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled && !isAnimatingRef.current,
      onMoveShouldSetPanResponder: () => enabled && !isAnimatingRef.current,
      onPanResponderGrant: () => {
        if (!enabled || isAnimatingRef.current) return;
        translateX.stopAnimation();
      },
      onPanResponderMove: (_event, gesture) => {
        if (!enabled || isAnimatingRef.current) return;
        const next =
          direction === "left"
            ? Math.max(0, Math.min(gesture.dx, width))
            : Math.min(0, Math.max(gesture.dx, -width));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        if (!enabled || isAnimatingRef.current) return;
        const velocityX = gesture.vx * 1000;
        const shouldBack =
          direction === "left"
            ? gesture.dx > width * THRESHOLD_RATIO || velocityX > VELOCITY_THRESHOLD
            : gesture.dx < -width * THRESHOLD_RATIO || velocityX < -VELOCITY_THRESHOLD;
        if (shouldBack) {
          finishBack(direction === "left" ? width : -width);
        } else {
          cancelBack(velocityX);
        }
      },
      onPanResponderTerminate: (_event, gesture) => {
        if (!enabled || isAnimatingRef.current) return;
        cancelBack(gesture.vx * 1000);
      }
    });

  const leftEdgePan = useMemo(() => createPanResponder("left"), [enabled, width]);
  const rightEdgePan = useMemo(() => createPanResponder("right"), [enabled, width]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.container, { transform: [{ translateX }] }]}>
        {children}
      </Animated.View>
      <View
        style={[styles.edgeZone, styles.edgeLeft]}
        pointerEvents="box-only"
        {...leftEdgePan.panHandlers}
      />
      <View
        style={[styles.edgeZone, styles.edgeRight]}
        pointerEvents="box-only"
        {...rightEdgePan.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  edgeZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH
  },
  edgeLeft: {
    left: 0
  },
  edgeRight: {
    right: 0
  }
});
