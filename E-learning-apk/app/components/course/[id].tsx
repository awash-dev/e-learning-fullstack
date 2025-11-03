 // app/components/course/[id].tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  comprehensiveCourseAPI,
  courseAPI,
  reviewAPI,
  courseInteraction,
  type Course,
  type Lesson,
  type Review,
  type CourseProgress,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// ==================== TYPES ====================
interface CourseDetailState {
  course: Course | null;
  lessons: Lesson[];
  reviews: Review[];
  isEnrolled: boolean;
  inWishlist: boolean;
  userReview: Review | null;
  progress: CourseProgress | null;
}

// ==================== SKELETON LOADER ====================
const SkeletonLoader = () => {
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
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonBadge, { opacity }]} />
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonText, { opacity }]} />
        <Animated.View style={[styles.skeletonText, { opacity, width: '80%' }]} />
        <View style={styles.skeletonStats}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={[styles.skeletonStat, { opacity }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  // State
  const [state, setState] = useState<CourseDetailState>({
    course: null,
    lessons: [],
    reviews: [],
    isEnrolled: false,
    inWishlist: false,
    userReview: null,
    progress: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Real-time updates interval
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // ==================== DATA LOADING ====================
  
  // Load complete course data
  const loadCourseData = useCallback(async (showLoader = true) => {
    if (!id) return;

    try {
      if (showLoader) setLoading(true);

      console.log('📚 Loading course data for ID:', id);

      // Use comprehensive API to get all data at once
      const result = await comprehensiveCourseAPI.getCompleteCourseData(id as string);

      if (result.success && result.data) {
        const { course, isEnrolled, progress, userReview, inWishlist } = result.data;

        // Update state
        setState({
          course: course || null,
          lessons: course?.lessons || [],
          reviews: course?.reviews || [],
          isEnrolled: isEnrolled || false,
          inWishlist: inWishlist || false,
          userReview: userReview || null,
          progress: progress || null,
        });

        console.log('✅ Course data loaded:', {
          title: course?.title,
          enrolled: isEnrolled,
          wishlist: inWishlist,
          lessons: course?.lessons?.length || 0,
        });

        // Track course view
        if (user && course?.id) {
          comprehensiveCourseAPI.trackCourseView(course.id).catch(console.error);
        }
      } else {
        throw new Error(result.error?.message || 'Failed to load course');
      }
    } catch (error: any) {
      console.error('❌ Error loading course:', error);
      
      if (showLoader) {
        Alert.alert(
          'Error',
          'Failed to load course details. Please try again.',
          [
            { text: 'Retry', onPress: () => loadCourseData() },
            { text: 'Go Back', onPress: () => router.back(), style: 'cancel' },
          ]
        );
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, user]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCourseData(false);
    setRefreshing(false);
  }, [loadCourseData]);

  // Real-time enrollment status check
  const checkEnrollmentStatus = useCallback(async () => {
    if (!state.course?.id || !user) return;

    try {
      const result = await courseAPI.checkEnrollment(state.course.id);
      
      if (result.success && result.data) {
        const newStatus = result.data.is_enrolled || false;
        
        // Only update if status changed
        if (newStatus !== state.isEnrolled) {
          setState(prev => ({ ...prev, isEnrolled: newStatus }));
          console.log('🔄 Enrollment status updated:', newStatus);
        }
      }
    } catch (error) {
      console.log('Enrollment check failed (silent)');
    }
  }, [state.course?.id, state.isEnrolled, user]);

  // ==================== EFFECTS ====================

  // Initial load
  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  // Set up real-time updates
  useEffect(() => {
    if (state.course?.id && user) {
      // Check enrollment status every 15 seconds
      updateIntervalRef.current = setInterval(checkEnrollmentStatus, 15000);

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [state.course?.id, user, checkEnrollmentStatus]);

  // ==================== HANDLERS ====================

  // Handle enrollment (FREE ONLY - No payment integration)
  const handleEnroll = async () => {
    // Check authentication
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to enroll in this course.',
        [
          { text: 'Login', onPress: () => router.push('/auth/login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!state.course?.id) return;

    // If already enrolled, start learning
    if (state.isEnrolled) {
      handleStartLearning();
      return;
    }

    try {
      setEnrolling(true);

      console.log('📝 Enrolling in course:', state.course.id);

      // Use course interaction helper for quick enroll
      const result = await courseInteraction.quickEnroll(state.course.id);

      if (result.success) {
        // Optimistic update
        setState(prev => ({ ...prev, isEnrolled: true }));

        // Reload data to get updated enrollment info
        await loadCourseData(false);

        Alert.alert(
          '🎉 Enrollment Successful!',
          'You can now access all course materials.',
          [
            {
              text: 'Start Learning',
              onPress: handleStartLearning,
            },
            {
              text: 'Continue Browsing',
              style: 'cancel',
            },
          ]
        );
      } else {
        throw new Error(result.error?.message || 'Enrollment failed');
      }
    } catch (error: any) {
      console.error('❌ Enrollment error:', error);

      // Handle already enrolled error
      if (error.response?.status === 409 || error.message?.includes('already enrolled')) {
        setState(prev => ({ ...prev, isEnrolled: true }));
        Alert.alert('Already Enrolled', 'You are already enrolled in this course!');
      } else {
        Alert.alert('Enrollment Failed', error.message || 'Failed to enroll in course');
      }
    } finally {
      setEnrolling(false);
    }
  };

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to use the wishlist feature.');
      return;
    }

    if (!state.course?.id) return;

    // Optimistic update
    const previousState = state.inWishlist;
    setState(prev => ({ ...prev, inWishlist: !prev.inWishlist }));

    try {
      const result = await courseInteraction.toggleWishlist(state.course.id);

      if (!result.success) {
        // Revert on failure
        setState(prev => ({ ...prev, inWishlist: previousState }));
        throw new Error(result.error?.message || 'Failed to update wishlist');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, inWishlist: previousState }));
      Alert.alert('Error', error.message || 'Failed to update wishlist');
    }
  };

  // Handle lesson press
  const handleLessonPress = (lesson: Lesson) => {
    // Check if lesson is accessible
    const isAccessible = state.isEnrolled || lesson.is_free === true;

    if (!isAccessible) {
      Alert.alert(
        'Enrollment Required',
        'Please enroll in the course to access this lesson.',
        [
          { text: 'Enroll Now', onPress: handleEnroll },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!lesson.id) {
      Alert.alert('Error', 'Lesson not available');
      return;
    }

    // Navigate to lesson player
    router.push({
      pathname: '/components/lesson/[id]',
      params: {
        id: lesson.id,
        courseId: state.course?.id,
        lessonTitle: lesson.title,
        courseTitle: state.course?.title,
      },
    });
  };

  // Handle start learning
  const handleStartLearning = () => {
    if (state.lessons.length === 0) {
      Alert.alert('No Lessons', 'This course has no lessons available yet.');
      return;
    }

    const firstLesson = state.lessons[0];
    
    if (firstLesson?.id) {
      router.push({
        pathname: '/components/lesson/[id]',
        params: {
          id: firstLesson.id,
          courseId: state.course?.id,
          lessonTitle: firstLesson.title,
          courseTitle: state.course?.title,
        },
      });
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!state.course?.id) return;

    try {
      const result = await courseInteraction.shareCourse(state.course.id, 'native');
      
      if (result.success) {
        Alert.alert('Share', `Share this course: ${result.data?.shareUrl}`);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // ==================== HELPER FUNCTIONS ====================

  const getInstructorName = () => {
    return state.course?.instructor_name || 
           state.course?.created_by || 
           'Unknown Instructor';
  };

  const getInstructorEmail = () => {
    return state.course?.instructor_email || 'No email provided';
  };

  const getEnrolledCount = () => {
    if (!state.course) return 0;
    return state.course.enrolled_students?.length || 
           state.course.total_enrollments || 
           0;
  };

  const getTotalDuration = () => {
    if (state.lessons.length === 0) {
      return state.course?.duration || 'Self-paced';
    }

    const totalMinutes = state.lessons.reduce((total, lesson) => {
      const duration = typeof lesson.duration === 'string'
        ? parseInt(lesson.duration.match(/(\d+)/)?.[1] || '0')
        : lesson.duration || 0;
      return total + duration;
    }, 0);

    if (totalMinutes === 0) return 'Self-paced';
    if (totalMinutes < 60) return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getLessonDuration = (lesson: Lesson) => {
    if (typeof lesson.duration === 'string') return lesson.duration;
    return lesson.duration ? `${lesson.duration} min` : '0 min';
  };

  const isLessonAccessible = (lesson: Lesson) => {
    return state.isEnrolled || lesson.is_free === true;
  };

  const getCourseRating = () => {
    if (!state.course?.rating) return 4.5;
    return typeof state.course.rating === 'number' ? state.course.rating : 4.5;
  };

  const getFormattedRating = () => getCourseRating().toFixed(1);

  const getTotalRatings = () => {
    return state.course?.total_ratings || state.reviews.length || 0;
  };

  const getProgressPercentage = () => {
    if (!state.progress) return 0;
    return state.progress.percentage || 0;
  };

  // ==================== RENDER ====================

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  // Error state
  if (!state.course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#E53E3E" />
          <Text style={styles.errorTitle}>Course Not Found</Text>
          <Text style={styles.errorText}>
            The course you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const courseRating = getCourseRating();
  const formattedRating = getFormattedRating();
  const totalRatings = getTotalRatings();
  const progressPercentage = getProgressPercentage();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.headerGradient}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {state.course.title}
          </Text>
          <TouchableOpacity style={styles.headerWishlistBtn} onPress={handleWishlistToggle}>
            <Ionicons
              name={state.inWishlist ? 'heart' : 'heart-outline'}
              size={24}
              color={state.inWishlist ? '#FC8181' : '#fff'}
            />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#667eea"
            colors={['#667eea']}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image
            source={{
              uri: state.course.thumbnail ||
                'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&h=400&fit=crop',
            }}
            style={[styles.heroImage, { width: windowWidth }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroOverlay}
          />

          {/* Floating Actions */}
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn} onPress={handleWishlistToggle}>
              <Ionicons
                name={state.inWishlist ? 'heart' : 'heart-outline'}
                size={24}
                color={state.inWishlist ? '#FC8181' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Status Badges */}
          <View style={styles.heroBadges}>
            {state.isEnrolled && (
              <LinearGradient colors={['#48BB78', '#38A169']} style={styles.badgeGradient}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.badgeText}>Enrolled</Text>
              </LinearGradient>
            )}
            
            {state.course.featured && (
              <LinearGradient colors={['#F6AD55', '#ED8936']} style={styles.badgeGradient}>
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={styles.badgeText}>Featured</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Course Header */}
          <View style={styles.courseHeader}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{state.course.category || 'General'}</Text>
            </LinearGradient>

            <Text style={styles.courseTitle}>{state.course.title}</Text>

            {state.course.description && (
              <Text style={styles.courseDescription}>{state.course.description}</Text>
            )}

            {/* Progress Bar (if enrolled) */}
            {state.isEnrolled && progressPercentage > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Your Progress</Text>
                  <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#48BB78', '#38A169']}
                    style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                  />
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="star" size={20} color="#F6AD55" />
                <Text style={styles.statValue}>{formattedRating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="people" size={20} color="#667eea" />
                <Text style={styles.statValue}>{getEnrolledCount()}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="time" size={20} color="#48BB78" />
                <Text style={styles.statValue}>{getTotalDuration()}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="book" size={20} color="#9F7AEA" />
                <Text style={styles.statValue}>{state.lessons.length}</Text>
                <Text style={styles.statLabel}>Lessons</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionBtn, state.inWishlist && styles.quickActionBtnActive]}
              onPress={handleWishlistToggle}
            >
              <Ionicons
                name={state.inWishlist ? 'heart' : 'heart-outline'}
                size={22}
                color={state.inWishlist ? '#E53E3E' : '#718096'}
              />
              <Text
                style={[
                  styles.quickActionText,
                  state.inWishlist && styles.quickActionTextActive,
                ]}
              >
                {state.inWishlist ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={22} color="#718096" />
              <Text style={styles.quickActionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn}>
              <Ionicons name="download-outline" size={22} color="#718096" />
              <Text style={styles.quickActionText}>Download</Text>
            </TouchableOpacity>
          </View>

          {/* Instructor Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Instructor</Text>
            <View style={styles.instructorRow}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.instructorAvatar}>
                <Text style={styles.instructorInitial}>
                  {getInstructorName().charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.instructorDetails}>
                <Text style={styles.instructorName}>{getInstructorName()}</Text>
                <Text style={styles.instructorEmail}>{getInstructorEmail()}</Text>
              </View>
            </View>
          </View>

          {/* Course Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Ionicons name="school" size={24} color="#667eea" />
              <Text style={styles.detailLabel}>Level</Text>
              <Text style={styles.detailValue}>
                {state.course.level
                  ? state.course.level.charAt(0).toUpperCase() + state.course.level.slice(1)
                  : 'All Levels'}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Ionicons name="language" size={24} color="#48BB78" />
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{state.course.language || 'English'}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['overview', 'curriculum', 'reviews'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'curriculum' && ` (${state.lessons.length})`}
                  {tab === 'reviews' && ` (${totalRatings})`}
                </Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'overview' && (
              <View style={styles.overviewTab}>
                {state.course.description && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About This Course</Text>
                    <Text style={styles.sectionText}>{state.course.description}</Text>
                  </View>
                )}

                {state.course.what_you_will_learn &&
                  state.course.what_you_will_learn.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>What You'll Learn</Text>
                      <View style={styles.list}>
                        {state.course.what_you_will_learn.map((item, index) => (
                          <View key={index} style={styles.listItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#48BB78" />
                            <Text style={styles.listText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {state.course.requirements && state.course.requirements.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Requirements</Text>
                    <View style={styles.list}>
                      {state.course.requirements.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                          <Ionicons name="chevron-forward" size={16} color="#667eea" />
                          <Text style={styles.listText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'curriculum' && (
              <View style={styles.curriculumTab}>
                <View style={styles.curriculumHeader}>
                  <Text style={styles.curriculumTitle}>Course Content</Text>
                  <Text style={styles.curriculumSubtitle}>
                    {state.lessons.length} lessons • {getTotalDuration()}
                  </Text>
                </View>

                {state.lessons.length > 0 ? (
                  <View style={styles.lessonsList}>
                    {state.lessons.map((lesson, index) => {
                      const accessible = isLessonAccessible(lesson);
                      return (
                        <TouchableOpacity
                          key={lesson.id || index}
                          style={[styles.lessonCard, !accessible && styles.lessonCardLocked]}
                          onPress={() => handleLessonPress(lesson)}
                          disabled={!accessible}
                          activeOpacity={0.7}
                        >
                          <View style={styles.lessonIconBox}>
                            <Ionicons
                              name={!accessible ? 'lock-closed' : 'play-circle'}
                              size={28}
                              color={!accessible ? '#CBD5E0' : '#667eea'}
                            />
                          </View>

                          <View style={styles.lessonContent}>
                            <View style={styles.lessonHeader}>
                              <Text
                                style={[
                                  styles.lessonNumber,
                                  !accessible && styles.lessonTextLocked,
                                ]}
                              >
                                Lesson {index + 1}
                              </Text>
                              {lesson.is_free && (
                                <View style={styles.freeTag}>
                                  <Text style={styles.freeTagText}>FREE</Text>
                                </View>
                              )}
                            </View>

                            <Text
                              style={[
                                styles.lessonTitle,
                                !accessible && styles.lessonTextLocked,
                              ]}
                            >
                              {lesson.title}
                            </Text>

                            {lesson.description && (
                              <Text style={styles.lessonDesc} numberOfLines={2}>
                                {lesson.description}
                              </Text>
                            )}

                            <View style={styles.lessonFooter}>
                              <Ionicons name="time-outline" size={14} color="#718096" />
                              <Text style={styles.lessonDuration}>
                                {getLessonDuration(lesson)}
                              </Text>
                            </View>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={accessible ? '#A0AEC0' : '#E2E8F0'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="book-outline" size={64} color="#CBD5E0" />
                    <Text style={styles.emptyText}>No lessons available yet</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsTab}>
                <View style={styles.reviewsHeader}>
                  <View style={styles.ratingOverview}>
                    <Text style={styles.overallRating}>{formattedRating}</Text>
                    <View style={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < Math.floor(courseRating) ? 'star' : 'star-outline'}
                          size={18}
                          color="#F6AD55"
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingsCount}>
                      {totalRatings} review{totalRatings !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {state.reviews.length > 0 ? (
                  <View style={styles.reviewsList}>
                    {state.reviews.map((review, index) => (
                      <View key={review.id || index} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewerAvatar}>
                            <Text style={styles.reviewerInitial}>
                              {review.user_name?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                          <View style={styles.reviewerInfo}>
                            <Text style={styles.reviewerName}>
                              {review.user_name || 'Anonymous'}
                            </Text>
                            <View style={styles.reviewStars}>
                              {[...Array(5)].map((_, i) => (
                                <Ionicons
                                  key={i}
                                  name={i < review.rating ? 'star' : 'star-outline'}
                                  size={12}
                                  color="#F6AD55"
                                />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewDate}>
                            {review.created_at
                              ? new Date(review.created_at).toLocaleDateString()
                              : 'Recently'}
                          </Text>
                        </View>
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-outline" size={64} color="#CBD5E0" />
                    <Text style={styles.emptyText}>No reviews yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to review!</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Fixed Bottom CTA */}
      <View style={styles.bottomCTA}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
          style={styles.bottomGradient}
        />
        <View style={styles.ctaContent}>
          <View style={styles.priceSection}>
            <Text style={styles.freePrice}>FREE</Text>
            <Text style={styles.priceLabel}>Course</Text>
          </View>

          <TouchableOpacity
            style={[styles.ctaBtn, enrolling && styles.ctaBtnLoading]}
            onPress={state.isEnrolled ? handleStartLearning : handleEnroll}
            disabled={enrolling}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={state.isEnrolled ? ['#48BB78', '#38A169'] : ['#667eea', '#764ba2']}
              style={styles.ctaGradient}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={state.isEnrolled ? 'play-circle' : 'download'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.ctaBtnText}>
                    {state.isEnrolled ? 'Continue Learning' : 'Enroll Now - Free'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Skeleton
  skeletonContainer: {
    flex: 1,
  },
  skeletonImage: {
    height: 280,
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    padding: 20,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 28,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skeletonStat: {
    flex: 1,
    height: 80,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginHorizontal: 12,
  },
  headerWishlistBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  hero: {
    position: 'relative',
    height: 320,
  },
  heroImage: {
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  heroActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heroBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadges: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 74,
    flexDirection: 'row',
    gap: 8,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },

  // Content
  content: {
    backgroundColor: '#F7FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 24,
  },

  // Course Header
  courseHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 14,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  courseTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
    lineHeight: 36,
  },
  courseDescription: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 20,
  },

  // Progress
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#48BB78',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionBtnActive: {
    backgroundColor: '#FFF5F5',
  },
  quickActionText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
  },
  quickActionTextActive: {
    color: '#E53E3E',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },

  // Instructor
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructorInitial: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  instructorDetails: {
    flex: 1,
  },
  instructorName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  instructorEmail: {
    fontSize: 14,
    color: '#718096',
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  tabTextActive: {
    color: '#667eea',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 20,
  },

  // Overview
  overviewTab: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A202C',
  },
  sectionText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 24,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
  },

  // Curriculum
  curriculumTab: {
    gap: 16,
  },
  curriculumHeader: {
    gap: 4,
  },
  curriculumTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A202C',
  },
  curriculumSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  lessonsList: {
    gap: 12,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  lessonCardLocked: {
    opacity: 0.6,
  },
  lessonIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonContent: {
    flex: 1,
    gap: 4,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lessonNumber: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lessonTextLocked: {
    color: '#CBD5E0',
  },
  freeTag: {
    backgroundColor: '#48BB78',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  freeTagText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
  },
  lessonDesc: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  lessonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  lessonDuration: {
    fontSize: 12,
    color: '#718096',
  },

  // Reviews
  reviewsTab: {
    gap: 20,
  },
  reviewsHeader: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ratingOverview: {
    alignItems: 'center',
    gap: 8,
  },
  overallRating: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingsCount: {
    fontSize: 14,
    color: '#718096',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  reviewerInfo: {
    flex: 1,
    gap: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 21,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CBD5E0',
    marginTop: 8,
  },

  // Bottom CTA
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    height: 20,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  priceSection: {
    flex: 1,
  },
  freePrice: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#48BB78',
  },
  priceLabel: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  ctaBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaBtnLoading: {
    opacity: 0.7,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});