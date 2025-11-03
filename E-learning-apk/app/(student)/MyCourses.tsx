// app/(student)/my-courses.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { courseAPI, type Course } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ==================== TYPES ====================
interface CourseProgress {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessed: string | null;
  completed: boolean;
  totalTimeWatched?: number;
}

interface CourseWithProgress extends Course {
  progress?: CourseProgress;
  isEnrolled: boolean;
}

type TabType = 'all' | 'in-progress' | 'completed';

// ==================== SKELETON LOADER ====================
const CourseCardSkeleton = ({ width }: { width: number }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.courseCard, { width }]}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <View style={styles.courseContent}>
        <Animated.View style={[styles.skeletonLine, { opacity, width: '60%' }]} />
        <Animated.View style={[styles.skeletonLine, { opacity, width: '100%', marginTop: 8 }]} />
        <Animated.View style={[styles.skeletonLine, { opacity, width: '80%', marginTop: 4 }]} />
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function MyCoursesScreen() {
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { user } = useAuth();

  const { width: windowWidth } = useWindowDimensions();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Responsive calculations
  const isSmallScreen = windowWidth < 375;
  const isTablet = windowWidth >= 768;
  const numColumns = isTablet ? 3 : 2;

  const getCardWidth = () => {
    const horizontalPadding = 32;
    const gap = 12;
    const totalGap = gap * (numColumns - 1);
    return (windowWidth - horizontalPadding - totalGap) / numColumns;
  };

  const cardWidth = getCardWidth();

  // ==================== HELPER FUNCTIONS ====================
  
  const getCourseProgress = (course: CourseWithProgress): number => {
    return course.progress?.percentage || 0;
  };

  const getProgressStatus = (progress: number): 'not-started' | 'in-progress' | 'completed' => {
    if (progress === 0) return 'not-started';
    if (progress >= 100) return 'completed';
    return 'in-progress';
  };

  const getCompletedLessonsCount = (course: CourseWithProgress): number => {
    return course.progress?.completedLessons || 0;
  };

  const getTotalLessonsCount = (course: CourseWithProgress): number => {
    return course.lessons?.length || 0;
  };

  // Helper to transform API data to match frontend expectations
  const transformCourseData = (course: any): CourseWithProgress => {
    // Parse enrolled_students if it's a string
    let enrolledStudents = [];
    try {
      if (typeof course.enrolled_students === 'string') {
        enrolledStudents = JSON.parse(course.enrolled_students);
      } else if (Array.isArray(course.enrolled_students)) {
        enrolledStudents = course.enrolled_students;
      }
    } catch (error) {
      console.log('Error parsing enrolled_students:', error);
      enrolledStudents = [];
    }

    // Parse arrays if they are strings
    const parseArrayField = (field: any): string[] => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field.split(',').map((item: string) => item.trim()).filter(Boolean);
        }
      }
      return [];
    };

    return {
      id: course.id,
      title: course.title || 'Untitled Course',
      description: course.description || '',
      category: course.category || 'General',
      thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=300&h=200&fit=crop',
      price: parseFloat(course.price) || 0,
      level: course.level || 'beginner',
      language: course.language || 'English',
      duration: course.duration || '',
      instructor_name: course.instructor_name || 'Unknown Instructor',
      instructor_email: course.instructor_email || '',
      instructor_avatar: course.instructor_avatar || '',
      instructor_bio: course.instructor_bio || '',
      rating: parseFloat(course.rating) || 0,
      total_ratings: parseInt(course.total_ratings) || 0,
      lessons: course.lessons || [],
      requirements: parseArrayField(course.requirements),
      what_you_will_learn: parseArrayField(course.what_you_will_learn),
      target_audience: parseArrayField(course.target_audience),
      enrolled_students: enrolledStudents,
      total_enrollments: parseInt(course.total_enrollments) || 0,
      status: course.status || 'published',
      featured: course.featured || false,
      is_active: course.is_active !== false,
      created_at: course.created_at,
      updated_at: course.updated_at,
      progress: course.progress || {
        percentage: Math.floor(Math.random() * 100), // Random progress for demo
        completedLessons: Math.floor(Math.random() * (course.lessons?.length || 5)),
        totalLessons: course.lessons?.length || 0,
        lastAccessed: new Date().toISOString(),
        completed: false,
        totalTimeWatched: 0
      },
      isEnrolled: true,
    };
  };

  // ==================== DATA LOADING ====================

  const loadEnrolledCourses = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      console.log('📚 Loading enrolled courses...');

      // Try the correct API method - getMyEnrolledCourses
      const result = await courseAPI.getMyEnrolledCourses();

      if (result.success && result.data?.courses) {
        // Transform the API data to match our frontend expectations
        const coursesWithProgress: CourseWithProgress[] = result.data.courses.map(
          (course: any) => transformCourseData(course)
        );

        setEnrolledCourses(coursesWithProgress);
        console.log('✅ Enrolled courses loaded:', coursesWithProgress.length);
        
        // Log sample course for debugging
        if (coursesWithProgress.length > 0) {
          console.log('📊 Sample course data:', {
            id: coursesWithProgress[0].id,
            title: coursesWithProgress[0].title,
            lessons: coursesWithProgress[0].lessons?.length,
            progress: coursesWithProgress[0].progress
          });
        }
      } else {
        throw new Error(result.error?.message || 'No enrolled courses found');
      }
    } catch (error: any) {
      console.error('❌ Error loading enrolled courses:', error);
      
      // More detailed error logging
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (showLoader) {
        Alert.alert(
          'Error',
          error.message || 'Failed to load your courses. Please check your connection and try again.',
          [
            { text: 'Retry', onPress: () => loadEnrolledCourses() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEnrolledCourses(false);
  }, [loadEnrolledCourses]);

  // ==================== COURSE CARD COMPONENT ====================

  const EnrolledCourseCard = React.memo(({ course }: { course: CourseWithProgress }) => {
    const progress = getCourseProgress(course);
    const progressStatus = getProgressStatus(progress);
    const completedLessons = getCompletedLessonsCount(course);
    const totalLessons = getTotalLessonsCount(course);

    const handleCoursePress = () => {
      if (!course.id) {
        Alert.alert('Error', 'Course information is incomplete');
        return;
      }
      // Navigate to course details or learning screen
      router.push(`/course/${course.id}`);
    };

    const handleReviewPress = () => {
      if (!course.id) return;
      // Navigate to course review screen
      router.push(`/course/${course.id}/review`);
    };

    const getStatusColor = () => {
      switch (progressStatus) {
        case 'completed':
          return '#48BB78';
        case 'in-progress':
          return '#4299E1';
        default:
          return '#CBD5E0';
      }
    };

    const getStatusText = () => {
      switch (progressStatus) {
        case 'completed':
          return 'Completed';
        case 'in-progress':
          return 'In Progress';
        default:
          return 'Not Started';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.courseCard, { width: cardWidth }]}
        onPress={handleCoursePress}
        activeOpacity={0.8}
      >
        {/* Course Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: course.thumbnail,
            }}
            style={styles.courseImage}
            resizeMode="cover"
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
          />

          {/* Progress Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          >
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={['#48BB78', '#38A169']}
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}% complete</Text>
            </View>
          </LinearGradient>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {/* Enrollment Badge */}
          <View style={styles.enrollBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text style={styles.enrollText}>Enrolled</Text>
          </View>
        </View>

        {/* Course Content */}
        <View style={styles.courseContent}>
          {/* Header */}
          <View style={styles.courseHeader}>
            <View style={styles.categoryRow}>
              <Ionicons name="bookmark" size={12} color="#667eea" />
              <Text style={styles.categoryText} numberOfLines={1}>
                {course.category}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F6AD55" />
              <Text style={styles.ratingText}>
                {typeof course.rating === 'number' ? course.rating.toFixed(1) : '0.0'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.courseTitle} numberOfLines={2}>
            {course.title}
          </Text>

          {/* Instructor */}
          {course.instructor_name && (
            <View style={styles.instructorRow}>
              <Ionicons name="person-outline" size={12} color="#718096" />
              <Text style={styles.instructorText} numberOfLines={1}>
                {course.instructor_name}
              </Text>
            </View>
          )}

          {/* Progress Stats */}
          <View style={styles.statsRow}>
            <Ionicons name="checkmark-circle" size={14} color="#48BB78" />
            <Text style={styles.statsText}>
              {completedLessons}/{totalLessons} lessons
            </Text>
          </View>

          {/* Price */}
          {course.price > 0 && (
            <View style={styles.priceRow}>
              <Ionicons name="pricetag" size={12} color="#48BB78" />
              <Text style={styles.priceText}>${course.price}</Text>
            </View>
          )}

          {/* Action Button */}
          {progressStatus === 'completed' ? (
            <TouchableOpacity style={styles.reviewBtn} onPress={handleReviewPress}>
              <Text style={styles.reviewBtnText}>View Course</Text>
              <Ionicons name="arrow-forward" size={14} color="#667eea" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.continueBtn} onPress={handleCoursePress}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.continueBtnGradient}>
                <Text style={styles.continueBtnText}>
                  {progressStatus === 'not-started' ? 'Start Learning' : 'Continue'}
                </Text>
                <Ionicons name="play" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  });

  // ==================== TAB COMPONENT ====================

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => {
    const isActive = activeTab === tab;

    const getCourseCount = () => {
      switch (tab) {
        case 'all':
          return enrolledCourses.length;
        case 'in-progress':
          return enrolledCourses.filter(
            (c) => getCourseProgress(c) > 0 && getCourseProgress(c) < 100
          ).length;
        case 'completed':
          return enrolledCourses.filter((c) => getCourseProgress(c) >= 100).length;
        default:
          return 0;
      }
    };

    return (
      <TouchableOpacity
        style={[styles.tabBtn, isActive && styles.tabBtnActive]}
        onPress={() => setActiveTab(tab)}
        activeOpacity={0.7}
      >
        {isActive && (
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.tabGradient} />
        )}
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
            {getCourseCount()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== FILTER COURSES ====================

  const filteredCourses = enrolledCourses.filter((course) => {
    const progress = getCourseProgress(course);

    switch (activeTab) {
      case 'in-progress':
        return progress > 0 && progress < 100;
      case 'completed':
        return progress >= 100;
      default:
        return true;
    }
  });

  // ==================== RENDER ====================

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Courses</Text>
        </View>
        <View style={styles.section}>
          <View style={[styles.coursesGrid, { gap: 12 }]}>
            {[1, 2, 3, 4].map((i) => (
              <CourseCardSkeleton key={i} width={cardWidth} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Courses</Text>
          <Text style={styles.headerSubtitle}>
            {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} enrolled
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButton tab="all" label="All" />
          <TabButton tab="in-progress" label="In Progress" />
          <TabButton tab="completed" label="Completed" />
        </View>

        {/* Courses Grid */}
        <View style={styles.section}>
          {filteredCourses.length === 0 ? (
            <View style={styles.emptyState}>
              {enrolledCourses.length === 0 ? (
                <>
                  <Ionicons name="book-outline" size={64} color="#CBD5E0" />
                  <Text style={styles.emptyTitle}>No Courses Enrolled</Text>
                  <Text style={styles.emptyDesc}>
                    Start your learning journey by enrolling in courses
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyBtnGradient}>
                      <Text style={styles.emptyBtnText}>Browse Courses</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons
                    name={
                      activeTab === 'in-progress'
                        ? 'time-outline'
                        : 'checkmark-circle-outline'
                    }
                    size={64}
                    color="#CBD5E0"
                  />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'in-progress'
                      ? 'No Courses in Progress'
                      : 'No Completed Courses'}
                  </Text>
                  <Text style={styles.emptyDesc}>
                    {activeTab === 'in-progress'
                      ? 'Start learning from your enrolled courses'
                      : 'Complete courses to see them here'}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <View style={[styles.coursesGrid, { gap: 12 }]}>
              {filteredCourses.map((course) => (
                <EnrolledCourseCard key={course.id} course={course} />
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    position: 'relative',
    overflow: 'hidden',
  },
  tabBtnActive: {
    backgroundColor: 'transparent',
  },
  tabGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    marginRight: 6,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabCount: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5568',
  },
  tabCountTextActive: {
    color: '#fff',
  },

  // Section
  section: {
    flex: 1,
    padding: 16,
  },

  // Courses Grid
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Course Card
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  // Skeleton
  skeletonImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },

  // Image Container
  imageContainer: {
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: 140,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Progress
  progressContainer: {
    gap: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },

  // Badges
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  enrollBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(72, 187, 120, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  enrollText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },

  // Content
  courseContent: {
    padding: 14,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#744210',
    fontWeight: '700',
  },

  // Title
  courseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
    lineHeight: 20,
  },

  // Instructor
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  instructorText: {
    fontSize: 12,
    color: '#718096',
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  statsText: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '600',
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  priceText: {
    fontSize: 12,
    color: '#48BB78',
    fontWeight: '700',
  },

  // Buttons
  continueBtn: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  continueBtnText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#667eea',
  },
  reviewBtnText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});