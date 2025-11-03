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
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { courseAPI } from "@/services/api";
import { router } from "expo-router";
import EditProfileModal from "@/components/EditProfileModal";

const { width } = Dimensions.get("window");

// --- Spacing System ---
const SPACING = { 
  xlarge: 32, 
  large: 24, 
  medium: 16, 
  small: 8, 
  xsmall: 4 
};

// --- Colors ---
const COLORS = {
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",
  secondary: "#ec4899",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  background: "#f8fafc",
  card: "#ffffff",
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
    light: "#94a3b8",
  },
  border: "#e2e8f0",
  gradient: {
    start: "#6366f1",
    end: "#8b5cf6",
  }
};

// --- Reusable Components ---
const StatCard = memo(
  ({
    icon,
    value,
    label,
    subtitle,
    trend,
    loading,
    color = COLORS.primary,
  }: {
    icon: any;
    value: string | number;
    label: string;
    subtitle?: string;
    trend?: number;
    loading: boolean;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statNumber, { color }]}>
        {loading ? "..." : value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend >= 0 ? "trending-up" : "trending-down"} 
            size={12} 
            color={trend >= 0 ? COLORS.success : COLORS.danger} 
          />
          <Text style={[
            styles.trendText, 
            { color: trend >= 0 ? COLORS.success : COLORS.danger }
          ]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  )
);

const InfoRow = memo(
  ({ icon, label, value, onPress }: { 
    icon: any; 
    label: string; 
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.infoItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.text.light} />
      )}
    </TouchableOpacity>
  )
);

const ActionButton = memo(
  ({ 
    icon, 
    title, 
    subtitle, 
    color = COLORS.primary, 
    onPress,
    disabled = false 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    color?: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionButtonLeft}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.actionTextContainer}>
          <Text style={[styles.actionButtonText, { color }]}>{title}</Text>
          {subtitle && (
            <Text style={styles.actionButtonSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={disabled ? COLORS.text.light : color} 
      />
    </TouchableOpacity>
  )
);

// --- Skeleton Loader ---
const ProfileSkeleton = memo(() => (
  <View style={styles.container}>
    <View style={styles.header}>
      <View style={[styles.skeletonLine, { width: 100, height: 24 }]} />
    </View>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card Skeleton */}
      <View style={styles.profileCard}>
        <View style={styles.skeletonAvatar} />
        <View style={[styles.skeletonLine, { width: "50%", height: 24, marginTop: 16 }]} />
        <View style={[styles.skeletonLine, { width: "60%", height: 16, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: "40%", height: 32, marginTop: 12 }]} />
      </View>

      {/* Stats Grid Skeleton */}
      <View style={styles.statsGrid}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={styles.skeletonStatCard} />
        ))}
      </View>

      {/* Info Section Skeleton */}
      <View style={styles.infoSection}>
        <View style={[styles.skeletonLine, { width: "40%", height: 18, marginBottom: 16 }]} />
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.skeletonInfoItem} />
        ))}
      </View>

      {/* Actions Section Skeleton */}
      <View style={styles.actionsSection}>
        <View style={[styles.skeletonLine, { width: "40%", height: 18, marginBottom: 16 }]} />
        {[...Array(4)].map((_, i) => (
          <View key={i} style={styles.skeletonActionItem} />
        ))}
      </View>
    </ScrollView>
  </View>
));

// --- Main Screen Component ---
const InstructorProfileScreen = () => {
  const { user, logout, refreshUser } = useAuth();

  const [courseStats, setCourseStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    averageRating: 0,
    totalRevenue: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const isMounted = useRef(true);

  // Enhanced fetchCourseStats function
  const fetchCourseStats = useCallback(async () => {
    try {
      const [instructorStats, instructorCourses] = await Promise.all([
        courseAPI.getInstructorStats(),
        courseAPI.getInstructorCourses(),
      ]);

      let stats = {
        totalCourses: 0,
        totalStudents: 0,
        averageRating: 0,
        totalRevenue: 0,
        completionRate: 0,
      };

      // Use stats from instructor stats endpoint if available
      if (instructorStats.success && instructorStats.data) {
        const statsData = instructorStats.data.stats || instructorStats.data;
        stats = {
          totalCourses: statsData.totalCourses || 0,
          totalStudents: statsData.totalStudents || 0,
          averageRating: statsData.averageRating || 0,
          totalRevenue: statsData.totalRevenue || 0,
          completionRate: statsData.completionRate || 0,
        };
      }

      // Fallback to calculating from courses
      if (instructorCourses.success && instructorCourses.data?.courses) {
        const courses = instructorCourses.data.courses;
        stats.totalCourses = courses.length;
        
        // Calculate total students and average rating
        let totalStudents = 0;
        let totalRating = 0;
        let ratedCourses = 0;

        courses.forEach((course: any) => {
          totalStudents += course.total_enrollments || 0;
          if (course.rating && course.rating > 0) {
            totalRating += course.rating;
            ratedCourses++;
          }
        });

        stats.totalStudents = totalStudents;
        stats.averageRating = ratedCourses > 0 ? Number((totalRating / ratedCourses).toFixed(1)) : 0;
      }

      setCourseStats(stats);
    } catch (error) {
      console.error("Error fetching course stats:", error);
      setCourseStats({
        totalCourses: 0,
        totalStudents: 0,
        averageRating: 0,
        totalRevenue: 0,
        completionRate: 0,
      });
    }
  }, []);

  // Load data function
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isMounted.current) return;

      try {
        if (!isRefresh) {
          setLoading(true);
        }

        await Promise.all([refreshUser(), fetchCourseStats()]);
      } catch (error) {
        console.error("Error loading profile data:", error);
        if (isMounted.current) {
          Alert.alert("Error", "Could not load your profile data.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
          
          // Animate content in
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    },
    [refreshUser, fetchCourseStats, fadeAnim, slideAnim]
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
      "Logout",
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
          }
        },
      ]
    );
  }, [logout]);

  const handleModalSuccess = useCallback(() => {
    setShowEditModal(false);
    loadData(true);
  }, [loadData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) 
        ? "N/A" 
        : date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
    } catch {
      return "N/A";
    }
  };

  // Safe user data accessors
  const getUserName = () => user?.name || "Instructor";
  const getUserEmail = () => user?.email || "No email";
  const getUserId = () => user?.id || "N/A";
  const getUserAvatar = () => user?.avatar || null;
  const getCreatedAt = () => user?.created_at || user?.createdAt;
  const getUpdatedAt = () => user?.updated_at || user?.updatedAt;
  const getUserBio = () => user?.profile?.bio || "No bio added yet. Tell students about your expertise!";

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Instructor Profile</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push("/(instructor)/settings")}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Animated.View 
          style={[
            styles.animatedContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {getUserAvatar() ? (
                  <Image source={{ uri: getUserAvatar() }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {getUserName().charAt(0)?.toUpperCase() || "I"}
                    </Text>
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                </View>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{getUserName()}</Text>
                <Text style={styles.userRole}>Instructor</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color={COLORS.warning} />
                  <Text style={styles.ratingText}>
                    {courseStats.averageRating || "No ratings yet"}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.userBio}>{getUserBio()}</Text>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="library-outline"
              value={courseStats.totalCourses}
              label="Courses"
              loading={loading}
              color={COLORS.primary}
            />
            <StatCard
              icon="people-outline"
              value={courseStats.totalStudents}
              label="Students"
              loading={loading}
              color={COLORS.secondary}
            />
            <StatCard
              icon="star-outline"
              value={courseStats.averageRating}
              label="Rating"
              loading={loading}
              color={COLORS.warning}
            />
            <StatCard
              icon="trending-up-outline"
              value={formatCurrency(courseStats.totalRevenue)}
              label="Revenue"
              loading={loading}
              color={COLORS.success}
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <ActionButton
              icon="add-circle-outline"
              title="Create New Course"
              subtitle="Start building your next course"
              color={COLORS.primary}
              onPress={() => router.push("/(instructor)/create-course")}
            />
            
            <ActionButton
              icon="analytics-outline"
              title="View Analytics"
              subtitle="Check your course performance"
              color={COLORS.success}
              onPress={() => router.push("/(instructor)/analytics")}
            />
            
            <ActionButton
              icon="chatbubble-ellipses-outline"
              title="Student Feedback"
              subtitle="Read reviews and messages"
              color={COLORS.secondary}
              onPress={() => router.push("/(instructor)/reviews")}
            />
          </View>

          {/* Account Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={getUserEmail()}
            />
            
            <InfoRow
              icon="key-outline"
              label="User ID"
              value={getUserId()}
            />
            
            <InfoRow
              icon="calendar-outline"
              label="Member Since"
              value={formatDate(getCreatedAt())}
            />
            
            <InfoRow
              icon="time-outline"
              label="Last Updated"
              value={formatDate(getUpdatedAt())}
            />
          </View>

          {/* Settings & Logout */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            
            <ActionButton
              icon="shield-checkmark-outline"
              title="Privacy & Security"
              color={COLORS.text.secondary}
              onPress={() => router.push("/(instructor)/privacy")}
            />
            
            <ActionButton
              icon="notifications-outline"
              title="Notification Settings"
              color={COLORS.text.secondary}
              onPress={() => router.push("/(instructor)/notifications")}
            />
            
            <ActionButton
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of your account"
              color={COLORS.danger}
              onPress={handleLogout}
              disabled={loggingOut}
            />
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.large,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text.primary,
  },
  settingsButton: {
    padding: SPACING.xsmall,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xlarge,
  },
  animatedContent: {
    flex: 1,
  },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    padding: SPACING.xlarge,
    borderRadius: 20,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.medium,
  },
  avatarContainer: {
    position: "relative",
    marginRight: SPACING.medium,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.card,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  userBio: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.medium,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
  },
  editButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  statCard: {
    width: (width - SPACING.large * 2 - SPACING.small) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.medium,
    marginBottom: SPACING.small,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.small,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: COLORS.text.light,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },

  // Info Section
  infoSection: {
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.medium,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: SPACING.medium,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.medium,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: "500",
  },

  // Actions Section
  actionsSection: {
    marginHorizontal: SPACING.large,
    marginTop: SPACING.large,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: SPACING.small,
  },
  settingsSection: {
    marginHorizontal: SPACING.large,
    marginTop: SPACING.medium,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: SPACING.small,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.medium,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  actionButtonDisabled: {
    opacity: 0.6,
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
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: COLORS.text.light,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: SPACING.xlarge,
  },

  // Skeleton Styles
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  skeletonAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e2e8f0",
  },
  skeletonStatCard: {
    width: (width - SPACING.large * 2 - SPACING.small) / 2,
    height: 110,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
  },
  skeletonInfoItem: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    marginBottom: 8,
  },
  skeletonActionItem: {
    width: "100%",
    height: 60,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    marginBottom: 8,
  },
});

export default InstructorProfileScreen;