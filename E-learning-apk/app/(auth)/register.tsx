import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { authAPI } from "@/services/api"; // Import API directly

type UserRole = "student" | "instructor";

const RegistrationScreen = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!acceptTerms) {
      Alert.alert("Error", "Please accept the Terms & Conditions");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      const userData = {
        name: fullName,
        email: email,
        password: password,
        role: selectedRole,
      };

      const result = await authAPI.register(userData);

      if (result.success) {
        Alert.alert(
          "Registration Successful!",
          "Your account has been created successfully. Please login to continue.",
          [
            {
              text: "Go to Login",
              onPress: () => {
                // Clear the form
                setFullName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setAcceptTerms(false);
                // Redirect to login page
                router.replace("/(auth)/login");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Registration Failed",
          result.error?.message || "Please try again with different credentials"
        );
      }
    } catch (error: any) {
      console.error("Registration error:", error);

      // Handle specific error cases
      if (error.message?.includes("network") || error.message?.includes("Network")) {
        Alert.alert("Network Error", "Please check your internet connection and try again.");
      } else if (error.message?.includes("email") || error.message?.includes("already")) {
        Alert.alert("Email Exists", "An account with this email already exists. Please use a different email or login.");
      } else if (error.message?.includes("password")) {
        Alert.alert("Weak Password", "Please choose a stronger password.");
      } else {
        Alert.alert("Registration Failed", error.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push("/(auth)/login");
  };

  const toggleRole = (role: UserRole) => {
    setSelectedRole(role);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Join LearnHub</Text>
            <Text style={styles.subtitle}>Start your learning journey today</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                editable={!isLoading}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Role Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>I want to join as:</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === "student" && styles.roleButtonSelected,
                  ]}
                  onPress={() => toggleRole("student")}
                  disabled={isLoading}
                >
                  <View style={styles.roleContent}>
                    <View
                      style={[
                        styles.radioCircle,
                        selectedRole === "student" && styles.radioCircleSelected,
                      ]}
                    >
                      {selectedRole === "student" && <View style={styles.radioInnerCircle} />}
                    </View>
                    <Ionicons
                      name="school-outline"
                      size={18} // Reduced icon size
                      color={selectedRole === "student" ? "#4299E1" : "#718096"}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        selectedRole === "student" && styles.roleTextSelected,
                      ]}
                    >
                      Student
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === "instructor" && styles.roleButtonSelected,
                  ]}
                  onPress={() => toggleRole("instructor")}
                  disabled={isLoading}
                >
                  <View style={styles.roleContent}>
                    <View
                      style={[
                        styles.radioCircle,
                        selectedRole === "instructor" && styles.radioCircleSelected,
                      ]}
                    >
                      {selectedRole === "instructor" && <View style={styles.radioInnerCircle} />}
                    </View>
                    <Ionicons
                      name="person-outline"
                      size={18} // Reduced icon size
                      color={selectedRole === "instructor" ? "#4299E1" : "#718096"}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        selectedRole === "instructor" && styles.roleTextSelected,
                      ]}
                    >
                      Instructor
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create a password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#999" /> {/* Reduced size */}
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>Must be at least 6 characters</Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={18} color="#999" /> {/* Reduced size */}
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptTerms(!acceptTerms)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms & Conditions</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                (!fullName || !email || !password || !confirmPassword || !acceptTerms || isLoading) &&
                styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={
                !fullName || !email || !password || !confirmPassword || !acceptTerms || isLoading
              }
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>
                  Create {selectedRole === "instructor" ? "Instructor" : "Student"} Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Already have an account? */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleSignIn} disabled={isLoading}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>
              {selectedRole === "instructor" ? "Instructor Account" : "Student Account"}
            </Text>
            <Text style={styles.infoText}>
              {selectedRole === "instructor"
                ? "Create and manage courses, track student progress, and share your knowledge."
                : "Access courses, track your learning progress, and achieve your goals."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24, // Reduced margin
    marginTop: 25, // Reduced margin
  },
  title: {
    fontSize: 28, // Reduced size
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4, // Reduced margin
  },
  subtitle: {
    fontSize: 14, // Reduced size
    color: "#718096",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12, // Reduced border radius
    padding: 20, // Reduced padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16, // Reduced margin
  },
  label: {
    fontSize: 14, // Reduced size
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 4, // Reduced margin
  },
  input: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10, // Reduced border radius
    paddingHorizontal: 12,
    paddingVertical: 10, // Reduced padding
    fontSize: 14, // Reduced size
    color: "#2d3748",
  },
  roleContainer: {
    flexDirection: "row",
    gap: 10, // Reduced gap
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#f7fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 10, // Reduced border radius
    padding: 12, // Reduced padding
  },
  roleButtonSelected: {
    borderColor: "#4299e1",
    backgroundColor: "#ebf8ff",
  },
  roleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6, // Reduced gap
  },
  radioCircle: {
    width: 18, // Reduced size
    height: 18, // Reduced size
    borderRadius: 9, // Reduced size
    borderWidth: 2,
    borderColor: "#cbd5e0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#4299e1",
    backgroundColor: "#4299e1",
  },
  radioInnerCircle: {
    width: 6, // Reduced size
    height: 6, // Reduced size
    borderRadius: 3, // Reduced size
    backgroundColor: "#fff",
  },
  roleText: {
    fontSize: 12, // Reduced size
    fontWeight: "600",
    color: "#718096",
  },
  roleTextSelected: {
    color: "#4299e1",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10, // Reduced border radius
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10, // Reduced padding
    fontSize: 14, // Reduced size
    color: "#2d3748",
  },
  eyeIcon: {
    padding: 8, // Reduced padding
  },
  passwordHint: {
    fontSize: 12, // Reduced size
    color: "#718096",
    marginTop: 2, // Reduced margin
    marginLeft: 4,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20, // Reduced margin
    padding: 6, // Reduced padding
  },
  checkbox: {
    width: 18, // Reduced size
    height: 18, // Reduced size
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#cbd5e0",
    marginRight: 8, // Reduced margin
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4299e1",
    borderColor: "#4299e1",
  },
  termsText: {
    flex: 1,
    fontSize: 12, // Reduced size
    color: "#718096",
    lineHeight: 18, // Reduced line height
  },
  termsLink: {
    color: "#4299e1",
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "#4299e1",
    borderRadius: 10, // Reduced border radius
    paddingVertical: 14, // Reduced padding
    alignItems: "center",
    marginBottom: 20, // Reduced margin
  },
  registerButtonDisabled: {
    backgroundColor: "#cbd5e0",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 14, // Reduced size
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    color: "#718096",
    fontSize: 12, // Reduced size
  },
  signInLink: {
    color: "#4299e1",
    fontSize: 12, // Reduced size
    fontWeight: "600",
  },
  infoContainer: {
    backgroundColor: "#edf2f7",
    borderRadius: 12,
    padding: 12, // Reduced padding
  },
  infoTitle: {
    fontSize: 14, // Reduced size
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 4, // Reduced margin
  },
  infoText: {
    fontSize: 12, // Reduced size
    color: "#718096",
    lineHeight: 18, // Reduced line height
  },
});

export default RegistrationScreen;
