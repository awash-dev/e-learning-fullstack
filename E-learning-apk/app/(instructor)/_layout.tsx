// app/(instructor)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, Platform, View } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

const COLORS = {
  primary: "#667eea",
  inactive: "#8E8E93",
  background: "#FFFFFF",
  border: "#E5E5EA",
  shadow: "#000000",
  tabBarBg: "#FFFFFF",
  iconBg: "#F2F2F7",
  activeIconBg: "#f0f4ff",
};

interface TabIconProps {
  name: IconName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View
      style={[
        styles.tabBarIcon,
        focused && styles.tabBarIconActive,
        { backgroundColor: focused ? COLORS.activeIconBg : "transparent" },
      ]}
    >
      <Ionicons name={name} size={24} color={color} />
    </View>
  );
}

export default function InstructorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
        tabBarAllowFontScaling: false,
      }}
    >
      {/* Main 4 Tabs */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid-outline" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarLabel: "Courses",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="library-outline" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="create-course"
        options={{
          title: "Create",
          tabBarLabel: "Create",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="add-circle-outline" color={color} focused={focused} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" color={color} focused={focused} />
          ),
        }}
      />

      {/* Hide all nested routes from tab bar */}
      <Tabs.Screen name="courses/[id]" options={{ href: null }} />
      <Tabs.Screen name="courses/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="courses/[id]/add-lesson" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="students" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E5EA",
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 85 : 70,
    paddingBottom: Platform.OS === "ios" ? 25 : 10,
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  tabBarIcon: {
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    minHeight: 48,
  },
  tabBarIconActive: {
    transform: [{ scale: 1.05 }],
  },
});