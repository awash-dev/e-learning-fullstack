// app/_layout.tsx
import { Stack, usePathname, useRouter } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";

// Auth routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/(auth)/welcome",
  "/(auth)/login",
  "/(auth)/register",
  "/auth-success",
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
}

function AuthLayout() {
  const { isAuthenticated, user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // User is authenticated
    if (isAuthenticated && user) {
      const role = user.role?.toLowerCase() || "student";
      
      // Get the correct route for user's role
      const roleRoute = getRoleRoute(role);
      
      // Redirect from auth pages to dashboard
      if (pathname.startsWith("/(auth)") || pathname === "/") {
        console.log(`✅ Authenticated user, redirecting to ${roleRoute}`);
        router.replace(roleRoute);
        return;
      }
      
      // Redirect if accessing wrong role section
      const currentRoleSection = getCurrentRoleSection(pathname);
      if (currentRoleSection && currentRoleSection !== role) {
        console.log(`⚠️ Wrong role section, redirecting from ${currentRoleSection} to ${role}`);
        router.replace(roleRoute);
      }
    } 
    // User is NOT authenticated
    else {
      // Allow public routes
      if (isPublicRoute(pathname)) {
        return;
      }
      
      // Redirect to welcome for protected routes
      console.log("❌ Not authenticated, redirecting to welcome");
      router.replace("/(auth)/welcome");
    }
  }, [isAuthenticated, user, loading, pathname]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(instructor)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="auth-success" />
      </Stack>
    </SafeAreaView>
  );
}

// Helper function to get route for user role
function getRoleRoute(role: string): any {
  switch (role.toLowerCase()) {
    case "admin":
      return "/(admin)";
    case "instructor":
      return "/(instructor)";
    case "student":
    default:
      return "/(student)";
  }
}

// Helper function to extract role from current pathname
function getCurrentRoleSection(pathname: string): string | null {
  if (pathname.startsWith("/(admin)")) return "admin";
  if (pathname.startsWith("/(instructor)")) return "instructor";
  if (pathname.startsWith("/(student)")) return "student";
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface || "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface || "#F5F5F5",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});