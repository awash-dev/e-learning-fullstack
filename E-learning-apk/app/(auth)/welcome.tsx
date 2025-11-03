import { AntDesign, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const WelcomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Background Decoration */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🎓</Text>
          <Text style={styles.title}>LearnHub</Text>
        </View>
        <Text style={styles.subtitle}>Your Learning Journey Starts Here</Text>
      </View>

      {/* Main Illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.illustration}>
          <View style={styles.illustrationCircle}>
            <Text style={styles.illustrationIcon}>📚</Text>
          </View>
          <View style={styles.floatingElement1}>
            <Text style={styles.floatingIcon}>🌟</Text>
          </View>
          <View style={styles.floatingElement2}>
            <Text style={styles.floatingIcon}>🚀</Text>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.welcomeTitle}>Welcome to LearnHub</Text>
          <Text style={styles.welcomeDescription}>
            Join thousands of students and instructors in our interactive
            learning platform. Learn new skills, share knowledge, and grow
            together.
          </Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIconContainer,
                { backgroundColor: "#ffeaa7" },
              ]}
            >
              <Text style={styles.featureIcon}>📚</Text>
            </View>
            <Text style={styles.featureNumber}>100+</Text>
            <Text style={styles.featureText}>Courses</Text>
          </View>

          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIconContainer,
                { backgroundColor: "#a29bfe" },
              ]}
            >
              <Text style={styles.featureIcon}>👨‍🏫</Text>
            </View>
            <Text style={styles.featureNumber}>20+</Text>
            <Text style={styles.featureText}>Instructors</Text>
          </View>

          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIconContainer,
                { backgroundColor: "#74b9ff" },
              ]}
            >
              <Text style={styles.featureIcon}>📱</Text>
            </View>
            <Text style={styles.featureNumber}>5K+</Text>
            <Text style={styles.featureText}>Students</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryButtonText}>Get Started Free</Text>
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>
                <FontAwesome name="chevron-circle-right" size={20} color="white" />{" "}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>Sign In to Account</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backgroundCircle1: {
    position: "absolute",
    top: -80, // Reduced height
    right: -80,
    width: 250, // Reduced size
    height: 250, // Reduced size
    borderRadius: 125,
    backgroundColor: "#f0f9ff",
    opacity: 0.8,
  },
  backgroundCircle2: {
    position: "absolute",
    bottom: -100, // Reduced height
    left: -100,
    width: 300, // Reduced size
    height: 300, // Reduced size
    borderRadius: 150,
    backgroundColor: "#f0fdf4",
    opacity: 0.6,
  },
  header: {
    alignItems: "center",
    paddingTop: 40, // Reduced padding
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8, // Reduced margin
  },
  logoIcon: {
    fontSize: 28, // Reduced size
    marginRight: 8,
  },
  title: {
    fontSize: 32, // Reduced size
    fontWeight: "bold",
    color: "#1a202c",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, // Reduced size
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20, // Reduced line height
  },
  illustrationContainer: {
    alignItems: "center",
    paddingVertical: 20, // Reduced padding
  },
  illustration: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationCircle: {
    width: 150, // Reduced size
    height: 150, // Reduced size
    borderRadius: 75,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 15 }, // Reduced shadow
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  illustrationIcon: {
    fontSize: 60, // Reduced size
  },
  floatingElement1: {
    position: "absolute",
    top: 10, // Adjusted for smaller size
    right: 20, // Adjusted for smaller size
    width: 50, // Reduced size
    height: 50, // Reduced size
    borderRadius: 25,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, // Reduced shadow
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  floatingElement2: {
    position: "absolute",
    bottom: 10, // Adjusted for smaller size
    left: 10, // Adjusted for smaller size
    width: 40, // Reduced size
    height: 40, // Reduced size
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 }, // Reduced shadow
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  floatingIcon: {
    fontSize: 20, // Reduced size
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 20, // Reduced padding
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 20, // Reduced margin
  },
  welcomeTitle: {
    fontSize: 28, // Reduced size
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12, // Reduced margin
    letterSpacing: -0.5,
  },
  welcomeDescription: {
    fontSize: 14, // Reduced size
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20, // Reduced line height
    maxWidth: 320,
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20, // Reduced margin
    paddingHorizontal: 10,
  },
  featureCard: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4, // Reduced margin
  },
  featureIconContainer: {
    width: 50, // Reduced size
    height: 50, // Reduced size
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8, // Reduced margin
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 20, // Reduced size
  },
  featureNumber: {
    fontSize: 16, // Reduced size
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2, // Reduced margin
  },
  featureText: {
    fontSize: 10, // Reduced size
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },
  buttonsContainer: {
    gap: 12, // Reduced gap
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 12, // Reduced padding
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16, // Reduced size
    fontWeight: "600",
    marginRight: 6, // Reduced margin
  },
  buttonIcon: {
    width: 20, // Reduced size
    height: 20, // Reduced size
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIconText: {
    color: "#fff",
    fontSize: 14, // Reduced size
    fontWeight: "bold",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 12, // Reduced padding
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#475569",
    fontSize: 14, // Reduced size
    fontWeight: "600",
  },
  footerText: {
    fontSize: 10, // Reduced size
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4, // Reduced margin
    lineHeight: 14, // Reduced line height
  },
});

export default WelcomeScreen;
