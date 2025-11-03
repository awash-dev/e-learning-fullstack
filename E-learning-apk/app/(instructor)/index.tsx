import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { courseAPI, type Course } from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";

// --- Spacing System ---
const SPACING = {
  xs: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Reusable Components (Optimized) ---

const StatCard = memo(
  ({
    icon,
    label,
    value,
    colors,
  }: {
    icon: any;
    label: string;
    value: string | number;
    colors: string[];
  }) => (
    <View style={styles.statCardContainer}>
      <LinearGradient
        colors={colors}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statIconWrapper}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </LinearGradient>
    </View>
  )
);

const CourseItem = memo(({ course }: { course: Course }) => {
  // Get actual student count for display
  const getStudentCount = () => {
    if (course.enrolled_students && Array.isArray(course.enrolled_students)) {
      return course.enrolled_students.length;
    } else if (typeof course.enrolled_students === 'number') {
      return course.enrolled_students;
    } else if (course.total_enrollments) {
      return course.total_enrollments;
    }
    return 0;
  };

  // Safe rating display with fallback
  const getRatingDisplay = () => {
    // Handle different possible rating formats
    const rating = course.rating !== undefined && course.rating !== null ? course.rating : undefined;
    
    if (rating === undefined || rating === null) {
      return "0.0";
    }
    
    // Ensure rating is a number before calling toFixed
    const numericRating = typeof rating === 'number' ? rating : parseFloat(rating);
    
    if (isNaN(numericRating)) {
      return "0.0";
    }
    
    return numericRating.toFixed(1);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "published":
        return "#10b981";
      case "draft":
        return "#f59e0b";
      case "archived":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "published":
        return "Live";
      case "draft":
        return "Draft";
      case "archived":
        return "Archived";
      default:
        return "Unknown";
    }
  };

  return (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => router.push('/(instructor)/courses')}
      activeOpacity={0.7}
    >
      <View style={styles.courseImageContainer}>
        {course.thumbnail ? (
          <Image
            source={{ uri: course.thumbnail }}
            style={styles.courseThumbnail}
          />
        ) : (
          <View style={[styles.courseThumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="book-outline" size={24} color="#94a3b8" />
          </View>
        )}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(course.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(course.status)}</Text>
        </View>
      </View>

      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>
        <View style={styles.courseMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color="#64748b" />
            <Text style={styles.metaText}>
              {getStudentCount()} {/* Show actual number */}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.metaText}>
              {getRatingDisplay()}
            </Text>
          </View>
          {course.price && course.price > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={12} color="#64748b" />
              <Text style={styles.metaText}>${course.price}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const QuickActionButton = memo(
  ({
    icon,
    title,
    subtitle,
    onPress,
    color,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  )
);

const DashboardSkeleton = memo(() => (
  <View style={styles.container}>
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.header}>
      <View style={styles.headerContent}>
        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.skeletonLine,
              { width: "60%", height: 24, marginBottom: 8 },
            ]}
          />
          <View style={[styles.skeletonLine, { width: "40%", height: 16 }]} />
        </View>
        <View style={styles.skeletonAvatar} />
      </View>
    </LinearGradient>
    <View style={styles.contentContainer}>
      <View style={styles.statsGrid}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={styles.skeletonStatCard} />
        ))}
      </View>
      <View style={styles.section}>
        <View
          style={[
            styles.skeletonLine,
            {
              width: "40%",
              height: 20,
              marginHorizontal: SPACING.large,
              marginBottom: SPACING.medium,
            },
          ]}
        />
        <View style={styles.courseGrid}>
          {[...Array(2)].map((_, i) => (
            <View key={i} style={styles.skeletonCourseCard} />
          ))}
        </View>
      </View>
    </View>
  </View>
));

// --- Main Dashboard Screen ---
const InstructorDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadDashboardData = useCallback(async () => {
    try {
      const coursesResult = await courseAPI.getInstructorCourses();
      if (coursesResult.success && coursesResult.data?.courses) {
        const fetchedCourses = coursesResult.data.courses;
        setCourses(fetchedCourses);

        // Calculate total unique students across all courses
        let totalUniqueStudents = 0;
        let allStudentIds = new Set(); // Use Set to track unique student IDs

        fetchedCourses.forEach((course) => {
          // Handle different enrolled_students data structures
          if (
            course.enrolled_students &&
            Array.isArray(course.enrolled_students)
          ) {
            // If enrolled_students is an array of student objects/IDs
            course.enrolled_students.forEach((student: any) => {
              // Extract student ID from different possible structures
              const studentId =
                student._id ||
                student.id ||
                (typeof student === "string" ? student : null);
              if (studentId) {
                allStudentIds.add(studentId);
              }
            });
          } else if (typeof course.enrolled_students === "number") {
            // If enrolled_students is a direct count
            totalUniqueStudents += course.enrolled_students;
          }

          // Also check if there's a direct total_enrollments
          if (
            course.total_enrollments &&
            typeof course.total_enrollments === "number"
          ) {
            totalUniqueStudents += course.total_enrollments;
          }
        });

        // If we have unique student IDs, use that count, otherwise use the sum
        // Also add any direct counts we found
        const totalStudents =
          allStudentIds.size > 0
            ? allStudentIds.size + totalUniqueStudents
            : totalUniqueStudents;

        const totalCourses = fetchedCourses.length;

        // Calculate total revenue (only count paid courses)
        const totalRevenue = fetchedCourses.reduce((sum, course) => {
          if (course.price && course.price > 0) {
            // Use the actual enrolled count for revenue calculation
            const enrolledCount =
              course.enrolled_students?.length || course.total_enrollments || 0;
            return sum + course.price * enrolledCount;
          }
          return sum;
        }, 0);

        // Safe average rating calculation
        const ratedCourses = fetchedCourses.filter(
          (c) => c.rating !== undefined && c.rating !== null && c.rating > 0
        );
        const averageRating =
          ratedCourses.length > 0
            ? ratedCourses.reduce(
                (sum, course) => sum + (course.rating || 0),
                0
              ) / ratedCourses.length
            : 0;

        setStats({
          totalCourses,
          totalStudents,
          totalRevenue,
          averageRating: Number(averageRating.toFixed(1)),
        });
      } else {
        setCourses([]);
        setStats({
          totalCourses: 0,
          totalStudents: 0,
          totalRevenue: 0,
          averageRating: 0,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format numbers for dashboard stats (keep as actual numbers for dashboard)
  const formatStatNumber = (num: number) => {
    return num.toString(); // Keep actual numbers for dashboard stats
  };

  const statsData = [
    {
      icon: "library-outline",
      label: "Total Courses",
      value: stats.totalCourses,
      colors: ["#667eea", "#764ba2"],
    },
    {
      icon: "people-outline",
      label: "Students",
      value: formatStatNumber(stats.totalStudents), // Actual numbers for dashboard
      colors: ["#10b981", "#059669"],
    },
    {
      icon: "cash-outline",
      label: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      colors: ["#ec4899", "#be185d"],
    },
    {
      icon: "star-outline",
      label: "Avg Rating",
      value: stats.averageRating || "0.0",
      colors: ["#f59e0b", "#d97706"],
    },
  ];

  const quickActions = [
    {
      icon: "add-circle",
      title: "Create Course",
      subtitle: "Start a new course",
      onPress: () => router.push("/(instructor)/create-course"),
      color: "#667eea",
    },
    {
      icon: "settings",
      title: "Settings",
      subtitle: "Manage preferences",
      onPress: () => router.push("/(instructor)/profile"),
      color: "#6b7280",
    },
  ];

  const recentCourses = courses.slice(0, 4);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#667eea"]}
            tintColor="#667eea"
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header Section */}
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>
                  {user?.name?.split(" ")[0] || "Instructor"}!
                </Text>
                <Text style={styles.subtitle}>
                  {courses.length > 0
                    ? `You have ${courses.length} course${
                        courses.length !== 1 ? "s" : ""
                      }`
                    : "Ready to create your first course?"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(instructor)/profile")}
                style={styles.avatarButton}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#667eea" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <Animated.View
            style={[
              { transform: [{ translateY: slideAnim }] },
              styles.contentContainer,
            ]}
          >
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {statsData.map((stat, index) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {quickActions.map((action, index) => (
                  <QuickActionButton key={action.title} {...action} />
                ))}
              </View>
            </View>

            {/* Recent Courses */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Courses</Text>
                {courses.length > 4 && (
                  <TouchableOpacity
                    onPress={() => router.push("/(instructor)/courses")}
                    style={styles.seeAllButton}
                  >
                    <Text style={styles.seeAllText}>View All</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#667eea"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {courses.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="book-outline" size={48} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>No Courses Yet</Text>
                  <Text style={styles.emptyDescription}>
                    Start your teaching journey by creating your first course
                  </Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push("/(instructor)/create-course")}
                  >
                    <Text style={styles.createButtonText}>
                      Create Your First Course
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.courseGrid}>
                  {recentCourses.map((course) => (
                    <CourseItem key={course.id || course.id} course={course} />
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: SPACING.xxlarge,
  },
  header: {
    paddingHorizontal: SPACING.large,
    paddingTop: SPACING.large,
    paddingBottom: SPACING.xxlarge,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "400",
  },
  avatarButton: {
    padding: SPACING.xs,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  contentContainer: {
    marginTop: -SPACING.xlarge,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: SPACING.large,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.large,
    marginBottom: SPACING.large,
  },
  statCardContainer: {
    width: "48%",
    marginBottom: SPACING.medium,
  },
  statCard: {
    padding: SPACING.medium,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 80,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  section: {
    marginBottom: SPACING.xlarge,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.large,
    marginBottom: SPACING.medium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: SPACING.large,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },

  actionsGrid: {
    paddingHorizontal: SPACING.large,
    gap: SPACING.small,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.medium,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },

  courseGrid: {
    paddingHorizontal: SPACING.large,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: SPACING.medium,
  },
  courseItem: {
    width: (SCREEN_WIDTH - SPACING.large * 2 - SPACING.medium) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: SPACING.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  courseImageContainer: {
    position: "relative",
    marginBottom: SPACING.small,
  },
  courseThumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  thumbnailPlaceholder: {
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: SPACING.small,
    lineHeight: 18,
  },
  courseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.small,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxlarge,
    marginHorizontal: SPACING.large,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.medium,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
    marginBottom: SPACING.small,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.large,
  },
  createButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    borderRadius: 12,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Skeleton Styles
  skeletonLine: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  skeletonStatCard: {
    width: "48%",
    height: 80,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    marginBottom: SPACING.medium,
  },
  skeletonCourseCard: {
    width: (SCREEN_WIDTH - SPACING.large * 2 - SPACING.medium) / 2,
    height: 160,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
  },
});

export default InstructorDashboard;