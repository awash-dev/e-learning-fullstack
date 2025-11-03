// app/(admin)/profile.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { courseAPI } from "@/services/api";
import { router } from "expo-router";
import EditProfileModal from "@/components/EditProfileModal";

// --- Spacing System ---
const SPACING = { large: 24, medium: 16, small: 8, xlarge: 32, tiny: 4 };

// --- Reusable Components ---
const StatCard = memo(
  ({
    icon,
    value,
    label,
    loading,
    color = "#6366f1",
    bgColor = "#eef2ff",
    onPress,
  }: {
    icon: any;
    value: string | number;
    label: string;
    loading: boolean;
    color?: string;
    bgColor?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statNumber}>{loading ? "..." : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress && (
        <View style={styles.statArrow}>
          <Ionicons name="chevron-forward" size={16} color={color} />
        </View>
      )}
    </TouchableOpacity>
  )
);

const InfoRow = memo(
  ({ 
    icon, 
    label, 
    value, 
    color = "#1e293b" 
  }: { 
    icon: any; 
    label: string; 
    value: string;
    color?: string;
  }) => (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={22} color="#94a3b8" style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color }]} numberOfLines={2} ellipsizeMode="tail">
          {value}
        </Text>
      </View>
    </View>
  )
);

const QuickActionCard = memo(
  ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#6366f1",
    bgColor = "#eef2ff",
  }: {
    icon: any;
    title: string;
    subtitle: string;
    onPress: () => void;
    color?: string;
    bgColor?: string;
  }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
    </TouchableOpacity>
  )
);

// --- Skeleton Loader ---
const ProfileSkeleton = memo(() => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View
        style={[
          styles.skeletonLine,
          { width: 150, height: 24, backgroundColor: "#d1d5db", alignSelf: "center" },
        ]}
      />
    </View>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <View style={styles.skeletonAvatar} />
        <View
          style={[
            styles.skeletonLine,
            { width: "50%", height: 24, marginTop: 16, alignSelf: "center" },
          ]}
        />
      </View>
      <View style={styles.statsGrid}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={styles.skeletonStatCard} />
        ))}
      </View>
    </ScrollView>
  </View>
));

// --- Main Screen Component ---
const AdminProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();

  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalAdmins: 0,
    totalRevenue: 0,
    totalCourses: 0,
    activeCourses: 0,
    totalEnrollments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  // Fetch comprehensive admin stats
  const fetchAdminStats = useCallback(async () => {
    try {
      const coursesResult = await courseAPI.getAllCourses();
      let totalRevenue = 0;
      let totalEnrollments = 0;
      let totalCourses = 0;
      let activeCourses = 0;

      if (coursesResult.success && coursesResult.data?.courses) {
        const courses = coursesResult.data.courses;
        totalCourses = courses.length;
        activeCourses = courses.filter((c: any) => c.isPublished || c.status === 'published').length;

        courses.forEach((course: any) => {
          const enrolledCount = Array.isArray(course.enrolledStudents)
            ? course.enrolledStudents.length
            : course.enrolledStudents || 0;

          const courseRevenue = (course.price || 0) * enrolledCount;
          totalRevenue += courseRevenue;
          totalEnrollments += enrolledCount;
        });
      }

      // Estimate user counts (you can replace with actual API call)
      setAdminStats({
        totalUsers: totalEnrollments + 15, // Estimated
        totalStudents: totalEnrollments,
        totalInstructors: 8, // Estimated
        totalAdmins: 3, // Estimated
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCourses,
        activeCourses,
        totalEnrollments,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      setAdminStats({
        totalUsers: 0,
        totalStudents: 0,
        totalInstructors: 0,
        totalAdmins: 0,
        totalRevenue: 0,
        totalCourses: 0,
        activeCourses: 0,
        totalEnrollments: 0,
      });
    }
  }, []);

  // Load data
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isMounted.current) return;

      try {
        if (!isRefresh) {
          setLoading(true);
        }

        await Promise.all([refreshUser(), fetchAdminStats()]);
      } catch (error) {
        console.error("Error loading admin data:", error);
        if (isMounted.current) {
          Alert.alert("Error", "Could not load admin data.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      }
    },
    [refreshUser, fetchAdminStats, fadeAnim]
  );

  useEffect(() => {
    isMounted.current = true;
    loadData(false);

    return () => {
      isMounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }, [logout]);

  const handleModalSuccess = useCallback(() => {
    setShowEditModal(false);
    loadData(true);
  }, [loadData]);

  // Helper functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Navigation handlers
  const handleManageAllUsers = () => router.push("/(admin)/users");
  const handleManageStudents = () => router.push("/(admin)/totalStudent");
  const handleManageInstructors = () => router.push("/(admin)/totalInstructor");
  const handleManageAdmins = () => router.push("/(admin)/totalAdmin");
  const handleManageCourses = () => router.push("/(admin)/");
  const handleViewAnalytics = () => Alert.alert("Analytics", "Analytics dashboard coming soon!");
  const handleSystemSettings = () => Alert.alert("Settings", "System settings coming soon!");
  const handleReports = () => Alert.alert("Reports", "Reports dashboard coming soon!");

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back, {user?.name}!</Text>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366f1"]}
            tintColor="#6366f1"
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Admin Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || "A"}
                  </Text>
                </View>
              )}
              {/* Admin Badge */}
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
              </View>
            </View>

            <Text style={styles.userName}>{user?.name || "Administrator"}</Text>
            <Text style={styles.userEmail}>{user?.email || "admin@learnhub.com"}</Text>
            
            <View style={styles.roleBadge}>
              <Ionicons name="shield" size={12} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.roleText}>ADMINISTRATOR</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={16} color="#6366f1" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Platform Overview Stats */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Platform Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="people-outline"
                value={adminStats.totalUsers}
                label="Total Users"
                loading={loading}
                color="#6366f1"
                bgColor="#eef2ff"
                onPress={handleManageAllUsers}
              />
              <StatCard
                icon="library-outline"
                value={adminStats.totalCourses}
                label="Total Courses"
                loading={loading}
                color="#8b5cf6"
                bgColor="#f3e8ff"
                onPress={handleManageCourses}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                icon="trending-up-outline"
                value={adminStats.totalEnrollments}
                label="Enrollments"
                loading={loading}
                color="#10b981"
                bgColor="#d1fae5"
              />
              <StatCard
                icon="cash-outline"
                value={`$${adminStats.totalRevenue}`}
                label="Revenue"
                loading={loading}
                color="#14b8a6"
                bgColor="#ccfbf1"
              />
            </View>
          </View>

          {/* User Management Stats */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="school-outline"
                value={adminStats.totalStudents}
                label="Students"
                loading={loading}
                color="#10b981"
                bgColor="#d1fae5"
                onPress={handleManageStudents}
              />
              <StatCard
                icon="person-outline"
                value={adminStats.totalInstructors}
                label="Instructors"
                loading={loading}
                color="#f59e0b"
                bgColor="#fef3c7"
                onPress={handleManageInstructors}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                icon="shield-outline"
                value={adminStats.totalAdmins}
                label="Admins"
                loading={loading}
                color="#ef4444"
                bgColor="#fee2e2"
                onPress={handleManageAdmins}
              />
              <StatCard
                icon="checkmark-circle-outline"
                value={adminStats.activeCourses}
                label="Active Courses"
                loading={loading}
                color="#06b6d4"
                bgColor="#cffafe"
              />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <QuickActionCard
              icon="people"
              title="Manage All Users"
              subtitle="View, edit, and manage all platform users"
              onPress={handleManageAllUsers}
              color="#6366f1"
              bgColor="#eef2ff"
            />

            <QuickActionCard
              icon="school"
              title="Manage Students"
              subtitle={`${adminStats.totalStudents} students enrolled`}
              onPress={handleManageStudents}
              color="#10b981"
              bgColor="#d1fae5"
            />

            <QuickActionCard
              icon="person"
              title="Manage Instructors"
              subtitle={`${adminStats.totalInstructors} active instructors`}
              onPress={handleManageInstructors}
              color="#f59e0b"
              bgColor="#fef3c7"
            />

            <QuickActionCard
              icon="shield"
              title="Manage Admins"
              subtitle={`${adminStats.totalAdmins} platform administrators`}
              onPress={handleManageAdmins}
              color="#ef4444"
              bgColor="#fee2e2"
            />

            <QuickActionCard
              icon="library"
              title="Manage Courses"
              subtitle={`${adminStats.totalCourses} courses on platform`}
              onPress={handleManageCourses}
              color="#8b5cf6"
              bgColor="#f3e8ff"
            />

            <QuickActionCard
              icon="analytics"
              title="View Analytics"
              subtitle="Platform insights and statistics"
              onPress={handleViewAnalytics}
              color="#14b8a6"
              bgColor="#ccfbf1"
            />

            <QuickActionCard
              icon="document-text"
              title="Generate Reports"
              subtitle="Create and download platform reports"
              onPress={handleReports}
              color="#06b6d4"
              bgColor="#cffafe"
            />

            <QuickActionCard
              icon="settings"
              title="System Settings"
              subtitle="Configure platform settings"
              onPress={handleSystemSettings}
              color="#64748b"
              bgColor="#f1f5f9"
            />
          </View>

          {/* Admin Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Admin Account Information</Text>
            <InfoRow
              icon="person-circle-outline"
              label="Full Name"
              value={user?.name || "N/A"}
            />
            <InfoRow
              icon="mail-outline"
              label="Email Address"
              value={user?.email || "N/A"}
            />
            <InfoRow
              icon="shield-checkmark-outline"
              label="Role"
              value="Platform Administrator"
              color="#dc2626"
            />
            <InfoRow
              icon="key-outline"
              label="Authentication Method"
              value={user?.authMethod === 'google' ? 'Google OAuth' : user?.authMethod === 'both' ? 'Email & Google' : 'Email & Password'}
            />
            <InfoRow
              icon="calendar-outline"
              label="Member Since"
              value={formatDate(user?.createdAt)}
            />
            <InfoRow
              icon="time-outline"
              label="Last Login"
              value={formatDateTime(user?.statistics?.lastLogin)}
            />
            <InfoRow
              icon="finger-print-outline"
              label="Admin ID"
              value={user?.id || "N/A"}
              color="#64748b"
            />
          </View>

          {/* System Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>System Actions</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: "#fee2e2" }]}>
                  <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                </View>
                <Text style={[styles.actionButtonText, { color: "#dc2626" }]}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </View>
              {loggingOut ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleModalSuccess}
      />
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: SPACING.large,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginTop: 25,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xlarge,
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#fff",
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    padding: SPACING.xlarge,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#dc2626",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#dc2626",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#dc2626",
  },
  adminBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: SPACING.medium,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.medium,
    backgroundColor: "#eef2ff",
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    color: "#6366f1",
    fontWeight: "600",
    fontSize: 14,
  },

  // Section Container
  sectionContainer: {
    marginTop: SPACING.large,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: SPACING.medium,
    marginHorizontal: SPACING.large,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: SPACING.large,
    marginBottom: SPACING.small,
    gap: SPACING.small,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.medium,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.small,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  statArrow: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // Quick Action Card
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: SPACING.large,
    marginBottom: SPACING.small,
    padding: SPACING.medium,
    borderRadius: 16,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.medium,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },

  // Info Section
  infoSection: {
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.medium,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoIcon: {
    width: 32,
    alignItems: "center",
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.medium,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },

  // Actions Section
  actionsSection: {
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: SPACING.small,
    padding: SPACING.medium,
    overflow: "hidden",
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.medium,
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.medium,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },

  // Bottom Spacing
  bottomSpacing: {
    height: SPACING.xlarge * 2,
  },

  // Skeleton Styles
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  skeletonAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e2e8f0",
  },
  skeletonStatCard: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
  },
});

export default AdminProfileScreen;