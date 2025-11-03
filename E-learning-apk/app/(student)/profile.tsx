// app/(tabs)/profile.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import EditProfileModal from "@/components/EditProfileModal";
import { authAPI, courseAPI, type User, type LearningStats } from "@/services/api";

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [completeUserData, setCompleteUserData] = useState<User | null>(null);

  // Fetch complete user profile from API
  const fetchCompleteUserProfile = async () => {
    try {
      setApiError(null);
      console.log("👤 Fetching complete user profile from API...");
      
      const result = await authAPI.getProfile();
      
      if (result.success && result.data?.user) {
        console.log("✅ Complete user profile fetched:", result.data.user);
        setCompleteUserData(result.data.user);
        
        // Update user context with complete data
        if (refreshUser) {
          await refreshUser();
        }
        
        return result.data.user;
      } else {
        throw new Error(result.error?.message || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      setApiError('Failed to load profile data');
      throw error;
    }
  };

  // Fetch learning statistics from API
  const fetchLearningStatistics = async () => {
    try {
      console.log("📊 Fetching learning statistics from API...");
      
      const result = await courseAPI.getLearningStats();
      
      if (result.success && result.data?.stats) {
        console.log("✅ Learning statistics fetched:", result.data.stats);
        setLearningStats(result.data.stats);
        return result.data.stats;
      } else {
        throw new Error(result.error?.message || 'Failed to fetch learning statistics');
      }
    } catch (error) {
      console.error('❌ Error fetching learning statistics:', error);
      // Don't set error for stats - we can show fallback data
      return null;
    }
  };

  // Fetch enrolled courses count
  const fetchEnrolledCoursesCount = async () => {
    try {
      console.log("📚 Fetching enrolled courses count...");
      
      const result = await courseAPI.getMyEnrolledCourses();
      
      if (result.success && result.data?.courses) {
        const enrolledCount = result.data.courses.length;
        console.log("✅ Enrolled courses count:", enrolledCount);
        return enrolledCount;
      }
      return 0;
    } catch (error) {
      console.error('❌ Error fetching enrolled courses:', error);
      return 0;
    }
  };

  // Refresh all data from API
  const refreshAllData = async () => {
    try {
      setRefreshing(true);
      setApiLoading(true);
      console.log("🔄 Refreshing all profile data from API...");
      
      // Fetch all data in parallel
      const [userProfile, learningStatsData, enrolledCount] = await Promise.all([
        fetchCompleteUserProfile(),
        fetchLearningStatistics(),
        fetchEnrolledCoursesCount()
      ]);

      // If we have learning stats from API, use them
      if (learningStatsData) {
        setLearningStats(learningStatsData);
      } else if (userProfile?.statistics) {
        // Fallback to user statistics if learning stats API fails
        const fallbackStats: LearningStats = {
          totalEnrolledCourses: enrolledCount,
          completedCourses: userProfile.statistics.courses_completed || 0,
          inProgressCourses: enrolledCount - (userProfile.statistics.courses_completed || 0),
          notStartedCourses: 0,
          totalLearningTime: userProfile.statistics.total_learning_time || 0,
          averageCompletionRate: userProfile.statistics.courses_enrolled && userProfile.statistics.courses_completed 
            ? Math.round((userProfile.statistics.courses_completed / userProfile.statistics.courses_enrolled) * 100)
            : 0,
          certificatesEarned: userProfile.statistics.courses_completed || 0,
          recentActivity: []
        };
        setLearningStats(fallbackStats);
      }
      
      console.log("✅ All profile data refreshed successfully");
    } catch (error) {
      console.error('❌ Error refreshing profile data:', error);
      Alert.alert("Error", "Failed to refresh profile data");
    } finally {
      setRefreshing(false);
      setApiLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Handle logout
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await logout();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert("Error", "Failed to logout");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return formatDate(dateString);
    } catch (error) {
      return "Unknown";
    }
  };

  // Format learning time
  const formatLearningTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get display statistics - prioritize API data, fallback to context
  const getDisplayStatistics = () => {
    // Use learning stats API data first
    if (learningStats) {
      return {
        coursesEnrolled: learningStats.totalEnrolledCourses || 0,
        coursesCompleted: learningStats.completedCourses || 0,
        totalLearningTime: learningStats.totalLearningTime || 0,
        totalLessonsCompleted: Math.floor((learningStats.totalLearningTime || 0) / 10), // Estimate
        completionRate: learningStats.averageCompletionRate || 0,
        certificatesEarned: learningStats.certificatesEarned || 0,
      };
    }
    
    // Fallback to user statistics from profile
    const userData = completeUserData || user;
    if (userData?.statistics) {
      const stats = userData.statistics;
      const enrolled = stats.courses_enrolled || 0;
      const completed = stats.courses_completed || 0;
      const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
      
      return {
        coursesEnrolled: enrolled,
        coursesCompleted: completed,
        totalLearningTime: stats.total_learning_time || 0,
        totalLessonsCompleted: Math.floor((stats.total_learning_time || 0) / 10),
        completionRate,
        certificatesEarned: completed,
      };
    }
    
    // Final fallback
    return {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      totalLearningTime: 0,
      totalLessonsCompleted: 0,
      completionRate: 0,
      certificatesEarned: 0,
    };
  };

  const displayStats = getDisplayStatistics();
  const currentUser = completeUserData || user;

  const menuItems = [
    {
      icon: "person-outline",
      title: "Edit Profile",
      description: "Update your personal information and settings",
      onPress: () => setEditModalVisible(true),
    },
    {
      icon: "refresh-outline",
      title: "Refresh Data",
      description: "Update your profile and statistics",
      onPress: refreshAllData,
    },
  ];

  // Handle modal success
  const handleModalSuccess = () => {
    setEditModalVisible(false);
    // Refresh data after profile update
    setTimeout(() => {
      refreshAllData();
    }, 1000);
  };

  // Loading state
  if (apiLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={refreshAllData}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={22} 
            color={refreshing ? "#cbd5e0" : "#4299e1"} 
          />
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {apiError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#fff" />
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity onPress={refreshAllData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAllData}
            colors={["#4299e1"]}
            tintColor="#4299e1"
          />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {currentUser?.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
            {refreshing && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.name || "User"}</Text>
            <Text style={styles.userEmail}>{currentUser?.email || "No email"}</Text>
            
            {currentUser?.profile?.bio ? (
              <Text style={styles.userBio}>"{currentUser.profile.bio}"</Text>
            ) : (
              <Text style={styles.userBioHint}>
                Add a bio to tell others about yourself
              </Text>
            )}

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Ionicons name="person-circle-outline" size={16} color="#718096" />
                <Text style={styles.detailText}>
                  {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : "Student"}
                </Text>
              </View>

              {currentUser?.created_at && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#718096" />
                  <Text style={styles.detailText}>
                    Joined {formatDate(currentUser.created_at)}
                  </Text>
                </View>
              )}

              {currentUser?.statistics?.last_login && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#718096" />
                  <Text style={styles.detailText}>
                    Last active {formatRelativeTime(currentUser.statistics.last_login)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Learning Statistics */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Learning Journey</Text>
            {refreshing && <ActivityIndicator size="small" color="#4299e1" />}
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="library-outline" size={20} color="#4299E1" />
              </View>
              <Text style={styles.statNumber}>{displayStats.coursesEnrolled}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#F0FFF4' }]}>
                <Ionicons name="checkmark-done-outline" size={20} color="#38A169" />
              </View>
              <Text style={styles.statNumber}>{displayStats.coursesCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FFF5F5' }]}>
                <Ionicons name="trophy-outline" size={20} color="#E53E3E" />
              </View>
              <Text style={styles.statNumber}>{displayStats.certificatesEarned}</Text>
              <Text style={styles.statLabel}>Certificates</Text>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FFFAF0' }]}>
                <Ionicons name="time-outline" size={20} color="#DD6B20" />
              </View>
              <Text style={styles.statNumber}>
                {formatLearningTime(displayStats.totalLearningTime)}
              </Text>
              <Text style={styles.statLabel}>Learning</Text>
            </View>
          </View>

          {/* Progress Summary */}
          <View style={styles.progressSummary}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Course Completion Rate</Text>
              <Text style={styles.progressValue}>
                {displayStats.completionRate}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min(displayStats.completionRate, 100)}%` 
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Me</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{currentUser?.name || "Not set"}</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{currentUser?.email || "Not set"}</Text>
            </View>

            {currentUser?.profile?.phone && (
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={16} color="#718096" />
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{currentUser.profile.phone}</Text>
              </View>
            )}

            {currentUser?.profile?.address && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={16} color="#718096" />
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{currentUser.profile.address}</Text>
              </View>
            )}

            {currentUser?.profile?.bio && (
              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={16} color="#718096" />
                <Text style={styles.infoLabel}>Bio</Text>
                <Text style={styles.infoValue} numberOfLines={3}>
                  {currentUser.profile.bio}
                </Text>
              </View>
            )}

            {/* Skills Section */}
            {currentUser?.profile?.skills && currentUser.profile.skills.length > 0 && (
              <View style={styles.infoItem}>
                <Ionicons name="hammer-outline" size={16} color="#718096" />
                <Text style={styles.infoLabel}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {currentUser.profile.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Education Section */}
            {currentUser?.profile?.education && currentUser.profile.education.length > 0 && (
              <View style={styles.infoItem}>
                <Ionicons name="school-outline" size={16} color="#718096" />
                <Text style={styles.infoLabel}>Education</Text>
                <View style={styles.educationContainer}>
                  {currentUser.profile.education.map((edu, index) => (
                    <View key={index} style={styles.educationItem}>
                      <Text style={styles.educationText}>
                        {edu.degree} in {edu.field} at {edu.institution} ({edu.year})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons 
                  name={currentUser?.is_verified ? "checkmark-circle" : "time-outline"} 
                  size={14} 
                  color={currentUser?.is_verified ? "#38a169" : "#ed8936"} 
                />
                <Text style={styles.verifiedText}>
                  {currentUser?.is_verified ? "Verified" : "Pending Verification"}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="log-in-outline" size={16} color="#718096" />
              <Text style={styles.infoLabel}>Auth Method</Text>
              <Text style={styles.infoValue}>
                {currentUser?.auth_method ? 
                  currentUser.auth_method.charAt(0).toUpperCase() + currentUser.auth_method.slice(1) 
                  : "Local"
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Account Settings</Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              disabled={refreshing || loading}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color="#4a5568" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitleText}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, (loading || refreshing) && styles.disabledButton]}
          onPress={handleLogout}
          disabled={loading || refreshing}
        >
          {loading ? (
            <ActivityIndicator color="#e53e3e" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#e53e3e" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LearnHub v1.0.0</Text>
          {refreshing && (
            <Text style={styles.refreshingText}>Updating...</Text>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSuccess={handleModalSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#718096",
  },
  errorBanner: {
    backgroundColor: "#e53e3e",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a202c",
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4299e1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
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
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    alignItems: "center",
    width: "100%",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "#718096",
    marginBottom: 8,
    textAlign: "center",
  },
  userBio: {
    fontSize: 14,
    color: "#4a5568",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: "italic",
  },
  userBioHint: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: "italic",
  },
  detailsContainer: {
    width: "100%",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#718096",
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a202c",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
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
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 16,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: "#718096",
    fontWeight: "500",
    marginLeft: 12,
    marginRight: 8,
    width: 80,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#2d3748",
    fontWeight: "500",
    flex: 1,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fff4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: "#38a169",
    fontWeight: "600",
    marginLeft: 4,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillTag: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: "#4299E1",
    fontWeight: "500",
  },
  educationContainer: {
    gap: 4,
  },
  educationItem: {
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  educationText: {
    fontSize: 12,
    color: "#4A5568",
  },
  menuContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a202c",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f7fafc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2d3748",
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: "#718096",
  },
  logoutButton: {
    backgroundColor: "#fed7d7",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e53e3e",
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: "#a0aec0",
  },
  refreshingText: {
    fontSize: 12,
    color: "#4299e1",
    marginTop: 4,
  },
});