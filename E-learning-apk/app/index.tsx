// app/index.tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  StyleSheet, 
  View, 
  Text,
  Alert 
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { tokenManager } from "@/services/api";

export default function Index() {
  const { user, loading, isAuthenticated, refreshUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndRedirect = async () => {
      try {
        // Wait for initial auth check to complete
        if (loading) return;

        // Double-check token validity
        const hasValidToken = await tokenManager.getValidToken();
        
        if (hasValidToken && !user) {
          // Token exists but no user data, try to refresh
          try {
            await refreshUser();
            return; // Will re-trigger this effect with updated user
          } catch (error) {
            console.error("Failed to refresh user:", error);
            // Continue to redirect to login
          }
        }

        if (!isMounted) return;

        // Redirect based on auth state
        if (isAuthenticated && user) {
          const role = user.role?.toLowerCase() || "student";
          
          console.log(`✅ Redirecting ${role} to dashboard`);
          
          switch (role) {
            case "admin":
              router.replace("/(admin)");
              break;
            case "instructor":
              router.replace("/(instructor)");
              break;
            case "student":
            default:
              router.replace("/(student)");
              break;
          }
        } else {
          console.log("❌ No auth, redirecting to welcome");
          router.replace("/(auth)/welcome");
        }
      } catch (error: any) {
        console.error("Error during auth check:", error);
        
        if (isMounted) {
          setError(error.message || "Failed to authenticate");
          
          // Redirect to login after error
          setTimeout(() => {
            router.replace("/(auth)/welcome");
          }, 2000);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [user, loading, isAuthenticated, refreshUser]);

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }

  // Show loading state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>
        {loading || isChecking 
          ? "Checking authentication..." 
          : "Redirecting..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface || "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary || "#666",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: Colors.error || "#FF3B30",
    fontWeight: "600",
    marginBottom: 8,
  },
});