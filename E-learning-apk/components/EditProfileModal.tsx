// components/EditProfileModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UserPreferences {
  email_notifications?: boolean;
  course_updates?: boolean;
  newsletter?: boolean;
}

interface UserProfile {
  bio?: string;
  phone?: string;
  address?: string;
  location?: string;
  occupation?: string;
  interests?: string[];
}

interface LearningStatistics {
  coursesEnrolled: number;
  coursesCompleted: number;
  totalLearningTime: number;
  totalLessonsCompleted: number;
  lastActive: string;
}

const PROGRESS_STORAGE_KEY = "course_progress_";

export default function EditProfileModal({
  visible,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [interests, setInterests] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences - CORRECTED FIELD NAMES to match backend
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    course_updates: true,
    newsletter: false,
  });

  // Learning Statistics
  const [learningStats, setLearningStats] = useState<LearningStatistics>({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    totalLearningTime: 0,
    totalLessonsCompleted: 0,
    lastActive: "",
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "password" | "preferences" | "stats"
  >("profile");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Refs to track initial load and prevent unnecessary refreshes
  const modalOpenedRef = useRef(false);

  // Load learning statistics (without auto-refresh)
  const loadLearningStatistics = async () => {
    try {
      console.log("📊 Loading learning statistics in modal...");

      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter((key) =>
        key.startsWith(PROGRESS_STORAGE_KEY)
      );
      const progressData = await AsyncStorage.multiGet(progressKeys);

      let coursesCompleted = 0;
      let totalLessonsCompleted = 0;
      let totalLearningTime = 0;
      let lastActive = "";

      progressData.forEach(([key, value]) => {
        if (value) {
          try {
            const progress = JSON.parse(value);

            // Count completed courses (100% progress)
            if (progress.progress === 100) {
              coursesCompleted++;
            }

            // Count total lessons completed across all courses
            totalLessonsCompleted += progress.completedLessons?.length || 0;

            // Find most recent activity
            if (
              progress.lastUpdated &&
              (!lastActive || progress.lastUpdated > lastActive)
            ) {
              lastActive = progress.lastUpdated;
            }
          } catch (parseError) {
            console.error("Error parsing progress data:", parseError);
          }
        }
      });

      totalLearningTime = totalLessonsCompleted * 10;

      const newStats = {
        coursesEnrolled: progressKeys.length,
        coursesCompleted,
        totalLearningTime,
        totalLessonsCompleted,
        lastActive: lastActive || new Date().toISOString(),
      };

      console.log("📊 Modal stats loaded:", newStats);
      setLearningStats(newStats);
    } catch (error) {
      console.error("❌ Error loading learning statistics in modal:", error);
    }
  };

  // Manual refresh function (only called when user explicitly requests it)
  const refreshAllData = async () => {
    try {
      setRefreshing(true);
      console.log("🔄 Manual refresh triggered in modal...");

      // Refresh user data from API
      await refreshUser();

      // Refresh learning statistics
      await loadLearningStatistics();

      console.log("✅ Modal data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing modal data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize form with user data (without auto-refresh)
  const initializeForm = () => {
    if (user) {
      console.log("🔄 Initializing form with current user data");
      setName(user.name || "");
      setEmail(user.email || "");
      setBio(user.profile?.bio || "");
      setPhone(user.profile?.phone || "");
      setLocation(user.profile?.address || user.profile?.location || "");
      setOccupation(user.profile?.occupation || "");
      setInterests(user.profile?.interests?.join(", ") || "");
      
      // CORRECTED: Use backend field names
      setPreferences({
        email_notifications: user.preferences?.email_notifications ?? true,
        course_updates: user.preferences?.course_updates ?? true,
        newsletter: user.preferences?.newsletter ?? false,
      });
    }
  };

  // Load initial data when modal opens (ONLY ONCE when modal first opens)
  useEffect(() => {
    if (visible && !modalOpenedRef.current) {
      console.log(
        "🎯 Modal opened for the first time, loading initial data..."
      );
      modalOpenedRef.current = true;

      // Initialize form with current data (no API call)
      initializeForm();

      // Load stats from localStorage (no API call)
      loadLearningStatistics();
    }
  }, [visible]);

  // Reset modal state when it closes
  useEffect(() => {
    if (!visible) {
      console.log("🚪 Modal closed, resetting state...");
      modalOpenedRef.current = false;
      setRefreshing(false);
      setLoading(false);
      setUploadingAvatar(false);
    }
  }, [visible]);

  // Handle avatar selection
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload an avatar."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  // Handle profile update - CORRECTED to match backend structure
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    try {
      setLoading(true);

      // Format the data to match backend expectations
      const profileData = {
        name: name.trim(),
        profile: {
          bio: bio.trim(),
          phone: phone.trim(),
          address: location.trim(), // Using address field for location
          occupation: occupation.trim(),
          interests: interests
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i.length > 0),
        },
      };

      console.log("📤 Updating profile with data:", profileData);

      const result = await authAPI.updateProfile(profileData);

      if (result.success) {
        console.log("✅ Profile updated successfully in database");
        Alert.alert("Success", "Profile updated successfully!");

        // Refresh user data and trigger success callback
        await refreshUser();
        onSuccess?.();
      } else {
        throw new Error(result.error?.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("❌ Update profile error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload - CORRECTED to use proper FormData
  const handleAvatarUpload = async () => {
    if (!selectedImage) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      const filename = selectedImage.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : "image/jpeg";

      // CORRECTED: Use proper FormData structure for file upload
      formData.append("avatar", {
        uri: selectedImage,
        type: type,
        name: filename || "avatar.jpg",
      } as any);

      console.log("📤 Uploading avatar...");
      const result = await authAPI.uploadAvatar(formData);

      if (result.success) {
        console.log("✅ Avatar uploaded successfully");
        Alert.alert("Success", "Profile picture updated successfully!");
        setSelectedImage(null);

        // Refresh user data and trigger success callback
        await refreshUser();
        onSuccess?.();
      } else {
        throw new Error(result.error?.message || "Failed to upload avatar");
      }
    } catch (error: any) {
      console.error("❌ Avatar upload error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to upload avatar. Please try again."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    Alert.alert(
      "Remove Avatar",
      "Are you sure you want to remove your avatar?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setUploadingAvatar(true);
              console.log("🗑️ Removing avatar...");
              const result = await authAPI.removeAvatar();

              if (result.success) {
                console.log("✅ Avatar removed successfully");
                Alert.alert("Success", "Avatar removed successfully!");

                // Refresh user data and trigger success callback
                await refreshUser();
                onSuccess?.();
              } else {
                throw new Error(
                  result.error?.message || "Failed to remove avatar"
                );
              }
            } catch (error: any) {
              console.error("❌ Remove avatar error:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to remove avatar. Please try again."
              );
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  // Handle password change - CORRECTED field names
  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Validation Error", "Current password is required");
      return;
    }

    if (!newPassword) {
      Alert.alert("Validation Error", "New password is required");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      console.log("🔐 Changing password...");
      const result = await authAPI.changePassword({
        current_password: currentPassword, // CORRECTED: Use underscore naming
        new_password: newPassword,
      });

      if (result.success) {
        console.log("✅ Password changed successfully");
        Alert.alert("Success", "Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onSuccess?.();
      } else {
        throw new Error(result.error?.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("❌ Change password error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle preferences update - CORRECTED to use proper API structure
  const handleUpdatePreferences = async () => {
    try {
      setLoading(true);

      console.log("⚙️ Updating preferences:", preferences);
      
      // CORRECTED: Update preferences through profile update
      const result = await authAPI.updateProfile({
        preferences: preferences
      });

      if (result.success) {
        console.log("✅ Preferences updated successfully");
        Alert.alert("Success", "Preferences updated successfully!");

        // Refresh user data and trigger success callback
        await refreshUser();
        onSuccess?.();
      } else {
        throw new Error(
          result.error?.message || "Failed to update preferences"
        );
      }
    } catch (error: any) {
      console.error("❌ Update preferences error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update preferences. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Format learning time
  const formatLearningTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Reset form and close modal
  const handleClose = () => {
    console.log("🚪 Closing modal, resetting form...");
    setName(user?.name || "");
    setEmail(user?.email || "");
    setBio(user?.profile?.bio || "");
    setPhone(user?.profile?.phone || "");
    setLocation(user?.profile?.address || user?.profile?.location || "");
    setOccupation(user?.profile?.occupation || "");
    setInterests(user?.profile?.interests?.join(", ") || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSelectedImage(null);
    setActiveTab("profile");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1a202c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshAllData}
            disabled={refreshing || loading || uploadingAvatar}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#4299e1" />
            ) : (
              <Ionicons name="refresh" size={22} color="#4299e1" />
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "profile" && styles.activeTab]}
            onPress={() => setActiveTab("profile")}
            disabled={loading || uploadingAvatar}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={activeTab === "profile" ? "#4299e1" : "#718096"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "profile" && styles.activeTabText,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "password" && styles.activeTab]}
            onPress={() => setActiveTab("password")}
            disabled={loading || uploadingAvatar}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={activeTab === "password" ? "#4299e1" : "#718096"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "password" && styles.activeTabText,
              ]}
            >
              Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "preferences" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("preferences")}
            disabled={loading || uploadingAvatar}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={activeTab === "preferences" ? "#4299e1" : "#718096"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "preferences" && styles.activeTabText,
              ]}
            >
              Preferences
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "stats" && styles.activeTab]}
            onPress={() => setActiveTab("stats")}
            disabled={loading || uploadingAvatar}
          >
            <Ionicons
              name="bar-chart-outline"
              size={20}
              color={activeTab === "stats" ? "#4299e1" : "#718096"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "stats" && styles.activeTabText,
              ]}
            >
              Stats
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAllData}
              colors={["#4299e1"]}
              tintColor="#4299e1"
              enabled={!loading && !uploadingAvatar}
            />
          }
        >
          {activeTab === "profile" ? (
            <>
              {/* Avatar Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Profile Picture</Text>
                  {(refreshing || uploadingAvatar) && (
                    <ActivityIndicator size="small" color="#4299e1" />
                  )}
                </View>

                <View style={styles.avatarContainer}>
                  <View style={styles.avatarWrapper}>
                    {selectedImage ? (
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.avatar}
                      />
                    ) : user?.avatar ? (
                      <Image
                        source={{ uri: user.avatar }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    {(uploadingAvatar || refreshing) && (
                      <View style={styles.avatarOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={styles.avatarButtons}>
                    <TouchableOpacity
                      style={styles.avatarButton}
                      onPress={pickImage}
                      disabled={uploadingAvatar || refreshing}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={20}
                        color="#4299e1"
                      />
                      <Text style={styles.avatarButtonText}>
                        {selectedImage ? "Change Photo" : "Choose Photo"}
                      </Text>
                    </TouchableOpacity>

                    {selectedImage && (
                      <TouchableOpacity
                        style={[styles.avatarButton, styles.uploadButton]}
                        onPress={handleAvatarUpload}
                        disabled={uploadingAvatar || refreshing}
                      >
                        {uploadingAvatar ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name="cloud-upload-outline"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.uploadButtonText}>Upload</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {user?.avatar && !selectedImage && (
                      <TouchableOpacity
                        style={[styles.avatarButton, styles.removeButton]}
                        onPress={handleRemoveAvatar}
                        disabled={uploadingAvatar || refreshing}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#e53e3e"
                        />
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Profile Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#a0aec0"
                    editable={!loading && !refreshing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.readOnlyInput}>
                    <Text style={styles.readOnlyText}>{email}</Text>
                  </View>
                  <Text style={styles.helpText}>Email cannot be changed</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself, your goals, and interests..."
                    placeholderTextColor="#a0aec0"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!loading && !refreshing}
                  />
                  <Text style={styles.charCount}>{bio.length}/200</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Occupation</Text>
                  <TextInput
                    style={styles.input}
                    value={occupation}
                    onChangeText={setOccupation}
                    placeholder="What do you do? (e.g., Student, Developer, Designer)"
                    placeholderTextColor="#a0aec0"
                    editable={!loading && !refreshing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Interests</Text>
                  <TextInput
                    style={styles.input}
                    value={interests}
                    onChangeText={setInterests}
                    placeholder="Separate with commas (e.g., Programming, Design, Business)"
                    placeholderTextColor="#a0aec0"
                    editable={!loading && !refreshing}
                  />
                  <Text style={styles.helpText}>
                    Add topics you're interested in learning
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#a0aec0"
                    keyboardType="phone-pad"
                    editable={!loading && !refreshing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Where are you based?"
                    placeholderTextColor="#a0aec0"
                    editable={!loading && !refreshing}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (loading || refreshing) && styles.disabledButton,
                  ]}
                  onPress={handleUpdateProfile}
                  disabled={loading || refreshing}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.saveButtonText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : activeTab === "password" ? (
            <>
              {/* Change Password Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Change Password</Text>
                <Text style={styles.sectionDescription}>
                  Choose a strong password with at least 6 characters
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#a0aec0"
                    secureTextEntry
                    editable={!loading && !refreshing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#a0aec0"
                    secureTextEntry
                    editable={!loading && !refreshing}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor="#a0aec0"
                    secureTextEntry
                    editable={!loading && !refreshing}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (loading || refreshing) && styles.disabledButton,
                  ]}
                  onPress={handleChangePassword}
                  disabled={loading || refreshing}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.saveButtonText}>Change Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : activeTab === "preferences" ? (
            <>
              {/* Preferences Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Notification Preferences
                </Text>
                <Text style={styles.sectionDescription}>
                  Manage how you receive notifications and updates
                </Text>

                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceInfo}>
                    <Text style={styles.preferenceTitle}>
                      Email Notifications
                    </Text>
                    <Text style={styles.preferenceDescription}>
                      Receive important updates via email
                    </Text>
                  </View>
                  <Switch
                    value={preferences.email_notifications}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        email_notifications: value,
                      }))
                    }
                    trackColor={{ false: "#e2e8f0", true: "#4299e1" }}
                    thumbColor="#fff"
                    disabled={loading || refreshing}
                  />
                </View>

                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceInfo}>
                    <Text style={styles.preferenceTitle}>Course Updates</Text>
                    <Text style={styles.preferenceDescription}>
                      Get notified about new course content
                    </Text>
                  </View>
                  <Switch
                    value={preferences.course_updates}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        course_updates: value,
                      }))
                    }
                    trackColor={{ false: "#e2e8f0", true: "#4299e1" }}
                    thumbColor="#fff"
                    disabled={loading || refreshing}
                  />
                </View>

                <View style={styles.preferenceItem}>
                  <View style={styles.preferenceInfo}>
                    <Text style={styles.preferenceTitle}>Newsletter</Text>
                    <Text style={styles.preferenceDescription}>
                      Receive our weekly newsletter
                    </Text>
                  </View>
                  <Switch
                    value={preferences.newsletter}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, newsletter: value }))
                    }
                    trackColor={{ false: "#e2e8f0", true: "#4299e1" }}
                    thumbColor="#fff"
                    disabled={loading || refreshing}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (loading || refreshing) && styles.disabledButton,
                  ]}
                  onPress={handleUpdatePreferences}
                  disabled={loading || refreshing}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="notifications-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.saveButtonText}>
                        Save Preferences
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Learning Statistics Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Learning Statistics</Text>
                  {refreshing && (
                    <ActivityIndicator size="small" color="#4299e1" />
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Your learning journey and progress overview
                </Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View
                      style={[styles.statIcon, { backgroundColor: "#EBF5FF" }]}
                    >
                      <Ionicons
                        name="library-outline"
                        size={20}
                        color="#4299E1"
                      />
                    </View>
                    <Text style={styles.statNumber}>
                      {learningStats.coursesEnrolled}
                    </Text>
                    <Text style={styles.statLabel}>Courses Enrolled</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View
                      style={[styles.statIcon, { backgroundColor: "#F0FFF4" }]}
                    >
                      <Ionicons
                        name="checkmark-done-outline"
                        size={20}
                        color="#38A169"
                      />
                    </View>
                    <Text style={styles.statNumber}>
                      {learningStats.coursesCompleted}
                    </Text>
                    <Text style={styles.statLabel}>Courses Completed</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View
                      style={[styles.statIcon, { backgroundColor: "#FFF5F5" }]}
                    >
                      <Ionicons name="book-outline" size={20} color="#E53E3E" />
                    </View>
                    <Text style={styles.statNumber}>
                      {learningStats.totalLessonsCompleted}
                    </Text>
                    <Text style={styles.statLabel}>Lessons Completed</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View
                      style={[styles.statIcon, { backgroundColor: "#FFFAF0" }]}
                    >
                      <Ionicons name="time-outline" size={20} color="#DD6B20" />
                    </View>
                    <Text style={styles.statNumber}>
                      {formatLearningTime(learningStats.totalLearningTime)}
                    </Text>
                    <Text style={styles.statLabel}>Learning Time</Text>
                  </View>
                </View>

                {/* Progress Summary */}
                <View style={styles.progressSummary}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      Course Completion Rate
                    </Text>
                    <Text style={styles.progressValue}>
                      {learningStats.coursesEnrolled > 0
                        ? Math.round(
                            (learningStats.coursesCompleted /
                              learningStats.coursesEnrolled) *
                              100
                          )
                        : 0}
                      %
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            learningStats.coursesEnrolled > 0
                              ? Math.min(
                                  (learningStats.coursesCompleted /
                                    learningStats.coursesEnrolled) *
                                    100,
                                  100
                                )
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.achievementSection}>
                  <Text style={styles.achievementTitle}>Recent Activity</Text>
                  <View style={styles.activityItem}>
                    <Ionicons name="time-outline" size={16} color="#718096" />
                    <Text style={styles.activityText}>
                      Last active: {formatDate(learningStats.lastActive)}
                    </Text>
                  </View>
                  {learningStats.coursesCompleted > 0 && (
                    <View style={styles.achievementBadge}>
                      <Ionicons
                        name="trophy-outline"
                        size={16}
                        color="#D69E2E"
                      />
                      <Text style={styles.achievementText}>
                        Completed {learningStats.coursesCompleted} course
                        {learningStats.coursesCompleted !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                  {learningStats.totalLessonsCompleted > 0 && (
                    <View style={styles.achievementBadge}>
                      <Ionicons name="book-outline" size={16} color="#4299E1" />
                      <Text
                        style={[styles.achievementText, { color: "#4299E1" }]}
                      >
                        {learningStats.totalLessonsCompleted} lessons completed
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Styles remain the same as your original file...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a202c",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4299e1",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#718096",
  },
  activeTabText: {
    color: "#4299e1",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a202c",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 20,
    lineHeight: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  avatarWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4299e1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButtons: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4299e1",
    gap: 6,
  },
  avatarButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4299e1",
  },
  uploadButton: {
    backgroundColor: "#4299e1",
    borderColor: "#4299e1",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  removeButton: {
    borderColor: "#e53e3e",
  },
  removeButtonText: {
    color: "#e53e3e",
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a202c",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  readOnlyInput: {
    backgroundColor: "#edf2f7",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: "#718096",
  },
  helpText: {
    fontSize: 12,
    color: "#a0aec0",
    marginTop: 4,
    fontStyle: "italic",
  },
  charCount: {
    fontSize: 12,
    color: "#a0aec0",
    textAlign: "right",
    marginTop: 4,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2d3748",
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: "#718096",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4299e1",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Statistics Styles
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    width: "48%",
    marginBottom: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2d3748",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#718096",
    textAlign: "center",
  },
  progressSummary: {
    marginTop: 8,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#4a5568",
    fontWeight: "500",
  },
  progressValue: {
    fontSize: 14,
    color: "#4299e1",
    fontWeight: "600",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4299e1",
    borderRadius: 3,
  },
  achievementSection: {
    marginTop: 16,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  activityText: {
    fontSize: 14,
    color: "#718096",
    marginLeft: 8,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFAF0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 12,
    color: "#D69E2E",
    fontWeight: "600",
    marginLeft: 6,
  },
});