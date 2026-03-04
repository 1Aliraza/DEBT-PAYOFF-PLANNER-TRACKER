import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  Pressable,
  Dimensions,
} from "react-native";
import React, { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useAnimatedProps,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_CONFIG = [
  {
    name: "index",
    label: "Debts",
    icon: "card" as const,
    iconActive: "card" as const,
    sfDefault: "creditcard",
    sfSelected: "creditcard.fill",
  },
  {
    name: "strategy",
    label: "Strategy",
    icon: "bar-chart-outline" as const,
    iconActive: "bar-chart" as const,
    sfDefault: "chart.bar",
    sfSelected: "chart.bar.fill",
  },
  {
    name: "plan",
    label: "Plan",
    icon: "calendar-outline" as const,
    iconActive: "calendar" as const,
    sfDefault: "calendar",
    sfSelected: "calendar.fill",
  },
  {
    name: "dashboard",
    label: "Tracking",
    icon: "stats-chart-outline" as const,
    iconActive: "stats-chart" as const,
    sfDefault: "gauge.medium",
    sfSelected: "gauge.medium",
  },
];

function NativeTabLayout() {
  return (
    <NativeTabs
      iconColor={{
        default: "#8E8E93",
        selected: Colors.primary,
      }}
      labelStyle={{
        default: { color: "#8E8E93" },
        selected: { color: Colors.primary },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Icon sf={{ default: tab.sfDefault, selected: tab.sfSelected }} />
          <Label>{tab.label}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  const tabBarWidth = width - 32;
  const tabWidth = tabBarWidth / TAB_CONFIG.length;

  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = withSpring(state.index, {
      damping: 20,
      stiffness: 200,
      mass: 0.6,
    });
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeIndex.value * tabWidth }],
  }));

  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 34 : 12);

  return (
    <View
      style={[
        styles.tabBarOuter,
        {
          bottom: bottomPad,
          left: 16,
          right: 16,
          borderColor: isDark
            ? "rgba(46,204,113,0.22)"
            : "rgba(46,204,113,0.18)",
        },
      ]}
    >
      <BlurView
        intensity={isDark ? 80 : 80}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.tabBarBlur,
          {
            backgroundColor: isDark
              ? "rgba(5,10,15,0.45)"
              : "rgba(255,255,255,0.75)",
          },
        ]}
      >
        <Animated.View
          style={[
            styles.pill,
            pillStyle,
            {
              width: tabWidth,
            },
          ]}
        >
          <View
            style={[
              styles.pillInner,
            {
              backgroundColor: isDark
                ? "rgba(46,204,113,0.28)"
                : "rgba(46,204,113,0.22)",
            },
            ]}
          />
        </Animated.View>

        <View style={styles.tabRow}>
          {TAB_CONFIG.map((tab, index) => {
            const isActive = state.index === index;
            return (
              <TabItem
                key={tab.name}
                tab={tab}
                isActive={isActive}
                activeIndex={activeIndex}
                index={index}
                isDark={isDark}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!isActive) {
                    navigation.navigate(tab.name);
                  }
                }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function TabItem({
  tab,
  isActive,
  activeIndex,
  index,
  isDark,
  onPress,
}: {
  tab: (typeof TAB_CONFIG)[0];
  isActive: boolean;
  activeIndex: Animated.SharedValue<number>;
  index: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const animStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const scale = interpolate(distance, [0, 1], [1.08, 0.94], "clamp");
    return { transform: [{ scale }] };
  });

  const iconColor = isActive
    ? Colors.primary
    : isDark
    ? Colors.dark.tabIconDefault
    : Colors.light.tabIconDefault;

  const labelColor = isActive
    ? Colors.primary
    : isDark
    ? Colors.dark.tabIconDefault
    : Colors.light.tabIconDefault;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.tabItemInner, animStyle]}>
        {Platform.OS === "ios" ? (
          <SymbolView
            name={isActive ? tab.sfSelected : tab.sfDefault}
            tintColor={iconColor}
            size={22}
          />
        ) : (
          <Ionicons
            name={isActive ? tab.iconActive : tab.icon}
            size={22}
            color={iconColor}
          />
        )}
        <Text
          style={[
            styles.tabLabel,
            {
              color: labelColor,
              fontWeight: isActive ? "700" : "500",
              opacity: isActive ? 1 : 0.7,
            },
          ]}
        >
          {tab.label}
        </Text>
        {isActive && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 20,
  },
  tabBarBlur: {
    flex: 1,
  },
  pill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pillInner: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 10,
    right: 10,
    borderRadius: 20,
  },
  tabRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 1,
  },
});
