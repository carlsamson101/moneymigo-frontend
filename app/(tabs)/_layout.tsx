// @ts-nocheck
import { LogBox } from "react-native";
LogBox.ignoreLogs([
  "setLayoutAnimationEnabledExperimental is currently a no-op",
  "expo-notifications: Android Push notifications",
   "Unexpected text node",                     // 🧘 hides RN-Web text node spam
  "Warning: Text strings must be rendered",   // companion message
]);


import React, { useState, useRef } from "react";
import { Tabs } from "expo-router";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Easing,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");
const FAB_SIZE = 60;

export default function TabsLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [fabPosition, setFabPosition] = useState({
    isRight: true,
  });

  const anim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const hoverScales = useRef({}).current;

  const pan = useRef(
    new Animated.ValueXY({
      x: width - FAB_SIZE * 0.4,
      y: height / 2 - FAB_SIZE / 2,
    })
  ).current;

  const tabs = [
    { name: "index", icon: "home", label: "Home", colors: ["#1f4b81ff", "#1f4b81ff"], isTab: true },
    { name: "budget", icon: "wallet", label: "Budget", colors: ["#1f4b81ff", "#1f4b81ff"], isTab: true },
    { name: "expenses", icon: "add-circle", label: "Expense", colors: ["#1f4b81ff", "#1f4b81ff"], isTab: true },
    { name: "deals", icon: "pricetag", label: "Marketplace", colors: ["#1f4b81ff", "#1f4b81ff"], isTab: false },
    { name: "profile", icon: "person-circle", label: "Profile", colors: ["#1f4b81ff", "#1f4b81ff"], isTab: true },
  ];

  tabs.forEach((tab, i) => {
    if (!hoverScales[i]) hoverScales[i] = new Animated.Value(0);
  });

  // ✅ PanResponder for dragging + snapping + half-visible edges
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,

      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: () => {
        pan.flattenOffset();

        let finalX = Math.max(0, Math.min(pan.x._value, width - FAB_SIZE));
        let finalY = Math.max(0, Math.min(pan.y._value, height - FAB_SIZE));

        // Snap horizontally (60% hidden) - only left or right
        if (finalX < width / 2) {
          finalX = -FAB_SIZE * 0.6;
        } else {
          finalX = width - FAB_SIZE * 0.4;
        }

        // Clamp vertical position
        finalY = Math.max(FAB_SIZE, Math.min(finalY, height - FAB_SIZE * 2));

        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
        }).start();

        setFabPosition({
          isRight: finalX > width / 2,
        });
      },
    })
  ).current;

  const toggleFab = () => {
    const toOpen = !menuVisible;
    
    Animated.parallel([
      Animated.timing(anim, {
        toValue: toOpen ? 1 : 0,
        duration: 500,
        easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 500,
        easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: toOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setMenuVisible(toOpen);
  };

   const handleTabPress = (tab) => {
    toggleFab();
    setTimeout(() => {
      if (tab.name === "index") {
        router.push("/(tabs)");
      } else if (tab.isTab) {
        router.push(`/${tab.name}`);
      } else {
        router.push(`/${tab.name}`);
      }
    }, 100);
  };

  const handleHover = (index, isHovering) => {
    setHoveredTab(isHovering ? index : null);
    Animated.timing(hoverScales[index], {
      toValue: isHovering ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const radius = 140;
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        {tabs.filter((tab) => tab.isTab).map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ href: null }} />
        ))}
      </Tabs>

      {/* Dark Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
        pointerEvents={menuVisible ? "auto" : "none"}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1}
          onPress={toggleFab}
        />
      </Animated.View>

      {/* FAB + Fan Menu */}
      <Animated.View
        style={[
          styles.rootContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        pointerEvents="box-none"
      >
        {tabs.map((tab, i) => {
          // 🌙 Arc always opens horizontally
          const baseAngle = 0;
          const angle = ((i - 2) / 4) * (Math.PI / 1.15) + baseAngle;

          let x = radius * Math.cos(angle);
          let y = radius * Math.sin(angle);

          // Flip horizontally when on right
          x = fabPosition.isRight ? -Math.abs(x) : Math.abs(x);

          const hoverScale = hoverScales[i].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.2],
          });
          const isHovered = hoveredTab === i;

          return (
            <Animated.View
              key={i}
              style={[
                styles.menuItem,
                {
                  transform: [
                    {
                      translateX: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, x],
                      }),
                    },
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, y],
                      }),
                    },
                    { scale: hoverScale },
                  ],
                  opacity: anim,
                },
              ]}
              pointerEvents={menuVisible ? "auto" : "none"}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleTabPress(tab)}
                onPressIn={() => handleHover(i, true)}
                onPressOut={() => handleHover(i, false)}
                style={styles.menuButton}
              >
                <LinearGradient
                  colors={tab.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.circleWrapper, isHovered && styles.circleWrapperActive]}
                >
                  <View style={[styles.circleInner, isHovered && styles.circleInnerActive]}>
                    <Ionicons name={tab.icon} size={26} color="#fff" />
                    <Text style={[styles.iconLabel, isHovered && styles.labelActive]}>
                      {tab.label}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Draggable FAB */}
        <Animated.View {...panResponder.panHandlers}>
          <TouchableOpacity onPress={toggleFab} activeOpacity={0.9} style={styles.fabButton}>
            <LinearGradient
              colors={["#1E40AF", "#3B82F6", "#60A5FA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabWrapper}
            >
              <View style={styles.fabInner}>
                <Animated.View 
                  style={{ 
                    transform: [{ rotate: rotation }],
                    position: 'absolute',
                    [fabPosition.isRight ? 'left' : 'right']: 0,
                  }}
                >
                  <Ionicons 
                    name={fabPosition.isRight ? "chevron-back" : "chevron-forward"} 
                    size={28} 
                    color="#fff" 
                  />
                </Animated.View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 999,
  },
  overlayTouchable: {
    flex: 1,
  },
  rootContainer: { position: "absolute", top: 0, left: 0, zIndex: 1000 },
  menuItem: { position: "absolute", alignItems: "center", zIndex: 1001 },
  menuButton: { position: "relative" },
  circleWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 8,
  },
  circleInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.9)",
  },
  iconLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 3,
    textAlign: "center",
  },
  fabButton: { position: "relative", zIndex: 1002 },
  fabWrapper: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
  },
  fabInner: {
    width: FAB_SIZE - 6,
    height: FAB_SIZE - 6,
    borderRadius: (FAB_SIZE - 6) / 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(147,232,233,0.95)",
  },
});