// app/components/lesson/[id].tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  courseAPI,
  lessonAPI,
  reviewAPI,
  type Course,
  type Lesson,
} from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;

interface Review {
  id?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

interface CourseProgress {
  completed_lessons: string[];
  progress: number;
  last_accessed_lesson?: string;
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "curriculum" | "reviews"
  >("overview");
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (id) loadCourseData();
  }, [id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseResult = await courseAPI.getCourseById(id as string);

      if (!courseResult.success || !courseResult.data) {
        throw new Error("Failed to load course");
      }

      const courseData = courseResult.data.course || courseResult.data;
      setCourse(courseData);

      // Extract lessons
      if (courseData.lessons && Array.isArray(courseData.lessons)) {
        setLessons(courseData.lessons);
      }

      // Load reviews
      try {
        const reviewsResult = await reviewAPI.getCourseReviews(id as string);
        if (reviewsResult.success && reviewsResult.data?.reviews) {
          setReviews(reviewsResult.data.reviews);
          // Find user's review
          const myReview = reviewsResult.data.reviews.find(
            (r: Review) => r.user_id === user?.id
          );
          if (myReview) {
            setUserReview(myReview);
            setSelectedRating(myReview.rating);
          }
        }
      } catch (reviewError) {
        console.log("Reviews not available");
      }

      await loadCourseProgress();
    } catch (error: any) {
      console.error("Error loading course:", error);
      Alert.alert("Error", error.message || "Failed to load course");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadCourseProgress = async () => {
    try {
      // Check enrollment status to get progress
      const enrollmentResult = await courseAPI.checkEnrollment(id as string);
      if (enrollmentResult.success && enrollmentResult.data) {
        const enrollment = enrollmentResult.data;
        setCourseProgress({
          completed_lessons: enrollment.completed_lessons || [],
          progress: enrollment.progress || 0,
          last_accessed_lesson: enrollment.last_accessed_lesson,
        });
      } else {
        // Default progress for non-enrolled users
        setCourseProgress({
          completed_lessons: [],
          progress: 0,
          last_accessed_lesson: undefined,
        });
      }
    } catch (error) {
      console.log("Progress not available, using default");
      setCourseProgress({
        completed_lessons: [],
        progress: 0,
        last_accessed_lesson: undefined,
      });
    }
  };

  const markLessonCompleted = async (lessonId: string) => {
    if (!courseProgress) return;

    if (!courseProgress.completed_lessons.includes(lessonId)) {
      const newCompleted = [...courseProgress.completed_lessons, lessonId];
      const newProgressValue = Math.round(
        (newCompleted.length / lessons.length) * 100
      );
      const updatedProgress = {
        ...courseProgress,
        completed_lessons: newCompleted,
        progress: newProgressValue,
        last_accessed_lesson: lessonId,
      };
      setCourseProgress(updatedProgress);

      // In a real app, you would save this to your API
      console.log("Lesson completed:", lessonId, "Progress:", newProgressValue);
    }
  };

  const handleVideoComplete = () => {
    if (currentLesson?.id && !isLessonCompleted(currentLesson.id)) {
      markLessonCompleted(currentLesson.id);
    }
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return courseProgress?.completed_lessons.includes(lessonId) || false;
  };

  const getTotalDuration = (): string => {
    if (course?.duration) return course.duration;

    let totalMinutes = 0;
    lessons.forEach((lesson) => {
      if (lesson.duration) {
        const match = lesson.duration.match(/(\d+)/);
        if (match) totalMinutes += parseInt(match[1]);
      }
    });

    if (totalMinutes > 0) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    return "Self-paced";
  };

  // FIXED: Get average rating with proper fallback and type checking
  const getAverageRating = (): number => {
    if (!course) return 0;
    const rating = course.rating;
    // Ensure rating is a valid number
    return typeof rating === "number" && !isNaN(rating) ? rating : 0;
  };

  // FIXED: Get formatted average rating for display
  const getFormattedAverageRating = (): string => {
    const rating = getAverageRating();
    return rating > 0 ? rating.toFixed(1) : "0.0";
  };

  // FIXED: Get total ratings with proper fallback
  const getTotalRatings = (): number => {
    if (!course) return 0;
    const total = course.total_ratings;
    return typeof total === "number" ? total : reviews.length || 0;
  };

  const getRatingDistribution = () => {
    if (reviews.length === 0) {
      return [5, 4, 3, 2, 1].map((stars) => ({ stars, percent: 0, count: 0 }));
    }

    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const starIndex = Math.floor(review.rating) - 1;
      if (starIndex >= 0 && starIndex < 5) distribution[4 - starIndex]++;
    });

    return [5, 4, 3, 2, 1].map((stars, index) => ({
      stars,
      count: distribution[index],
      percent: Math.round((distribution[index] / reviews.length) * 100),
    }));
  };

  const openRatingModal = () => {
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    if (!userReview) {
      setSelectedRating(0);
    }
  };

  const submitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert("Rating Required", "Please select a star rating");
      return;
    }

    try {
      setSubmittingRating(true);

      const ratingData = {
        rating: selectedRating,
        comment: "",
      };

      let result;
      if (userReview && userReview.id) {
        result = await reviewAPI.updateReview(
          id as string,
          userReview.id,
          ratingData
        );
      } else {
        result = await reviewAPI.addReview(id as string, ratingData);
      }

      if (result.success) {
        Alert.alert(
          "Success",
          userReview ? "Rating updated!" : "Thank you for your rating!"
        );
        await loadCourseData();
        closeRatingModal();
      } else {
        throw new Error(result.message || "Failed to submit rating");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const deleteRating = async () => {
    if (!userReview || !userReview.id) return;

    Alert.alert("Delete Rating", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await reviewAPI.deleteReview(
              id as string,
              userReview.id!
            );
            if (result.success) {
              Alert.alert("Success", "Rating deleted");
              setUserReview(null);
              setSelectedRating(0);
              await loadCourseData();
            }
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete rating");
          }
        },
      },
    ]);
  };

  const handleContinueLearning = () => {
    if (lessons.length === 0) {
      Alert.alert("No Lessons", "This course doesn't have any lessons yet.");
      return;
    }

    let startIndex = 0;
    if (courseProgress?.last_accessed_lesson) {
      const lastIndex = lessons.findIndex(
        (l) => l.id === courseProgress.last_accessed_lesson
      );
      if (lastIndex >= 0) startIndex = lastIndex;
    }

    openVideoPlayer(lessons[startIndex], startIndex);
  };

  const openVideoPlayer = (lesson: Lesson, index: number) => {
    setCurrentLesson(lesson);
    setCurrentLessonIndex(index);
    setVideoModalVisible(true);

    if (lesson.id && courseProgress) {
      const updatedProgress = {
        ...courseProgress,
        last_accessed_lesson: lesson.id,
      };
      setCourseProgress(updatedProgress);
    }
  };

  const closeVideoPlayer = () => {
    setVideoModalVisible(false);
    setCurrentLesson(null);
  };

  const navigateToNextLesson = () => {
    if (currentLessonIndex < lessons.length - 1) {
      const nextLesson = lessons[currentLessonIndex + 1];
      setCurrentLesson(nextLesson);
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else {
      closeVideoPlayer();
      if (!userReview) {
        Alert.alert(
          "Course Completed! 🎉",
          "Would you like to rate this course?",
          [
            { text: "Later", style: "cancel" },
            { text: "Rate Course", onPress: openRatingModal },
          ]
        );
      }
    }
  };

  const navigateToPreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const prevLesson = lessons[currentLessonIndex - 1];
      setCurrentLesson(prevLesson);
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const getVideoUrl = (lesson: Lesson): string | null => {
    return lesson.video_url || lesson.youtube_url || null;
  };

  // FIXED: Ensure these values are always defined and properly typed
  const progress = courseProgress?.progress || 0;
  const averageRating = getAverageRating();
  const formattedAverageRating = getFormattedAverageRating();
  const totalRatings = getTotalRatings();
  const totalDuration = getTotalDuration();
  const ratingDistribution = getRatingDistribution();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A435F0" />
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Course Not Found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1c1d1f" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.title}
          </Text>
          <View style={styles.headerProgress}>
            <Text style={styles.headerProgressText}>{progress}% complete</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1c1d1f" />
          </TouchableOpacity>

          <View style={styles.heroImageContainer}>
            <Image
              source={{
                uri:
                  course.thumbnail ||
                  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop",
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {lessons.length > 0 && (
              <TouchableOpacity
                style={styles.previewButton}
                onPress={handleContinueLearning}
              >
                <LinearGradient
                  colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]}
                  style={styles.previewGradient}
                >
                  <Ionicons name="play-circle" size={56} color="#fff" />
                  <Text style={styles.previewText}>Start Learning</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.courseInfo}>
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>Bestseller</Text>
            </View>

            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.subtitle}>{course.description}</Text>

            <View style={styles.ratingRow}>
              {/* FIXED: Use formatted rating instead of calling toFixed directly */}
              <Text style={styles.ratingNumber}>{formattedAverageRating}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= averageRating ? "star" : "star-outline"}
                    size={16}
                    color="#e59819"
                  />
                ))}
              </View>
              <Text style={styles.ratingCount}>
                ({totalRatings} rating{totalRatings !== 1 ? "s" : ""})
              </Text>
              <Text style={styles.studentCount}>
                {course.total_enrollments || 0} students
              </Text>
            </View>

            <View style={styles.courseMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color="#6a6f73" />
                <Text style={styles.metaText}>
                  Created by {course.instructor_name || "Instructor"}
                </Text>
              </View>
              {course.language && (
                <View style={styles.metaItem}>
                  <Ionicons name="globe-outline" size={16} color="#6a6f73" />
                  <Text style={styles.metaText}>{course.language}</Text>
                </View>
              )}
              {course.level && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="bar-chart-outline"
                    size={16}
                    color="#6a6f73"
                  />
                  <Text style={styles.metaText}>{course.level}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Progress & CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <Text style={styles.progressSubtitle}>
              {progress === 0
                ? "Start your learning journey"
                : progress === 100
                ? "Course completed! 🎉"
                : `${courseProgress?.completed_lessons.length || 0} of ${
                    lessons.length
                  } lessons completed`}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.ctaButton,
              lessons.length === 0 && styles.ctaButtonDisabled,
            ]}
            onPress={handleContinueLearning}
            disabled={lessons.length === 0}
          >
            <Text style={styles.ctaButtonText}>
              {lessons.length === 0
                ? "No Lessons Available"
                : progress === 0
                ? "Start Course"
                : progress === 100
                ? "Review Course"
                : "Continue Learning"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["overview", "curriculum", "reviews"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === "overview" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>What you'll learn</Text>
              {course.what_you_will_learn &&
              course.what_you_will_learn.length > 0 ? (
                <View style={styles.learningList}>
                  {course.what_you_will_learn.map((item, index) => (
                    <View key={index} style={styles.learningItem}>
                      <Ionicons name="checkmark" size={20} color="#1c1d1f" />
                      <Text style={styles.learningText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No learning objectives provided.
                </Text>
              )}

              {course.requirements && course.requirements.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Requirements</Text>
                  <View style={styles.requirementsList}>
                    {course.requirements.map((item, index) => (
                      <View key={index} style={styles.requirementItem}>
                        <Ionicons name="ellipse" size={8} color="#6a6f73" />
                        <Text style={styles.requirementText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === "curriculum" && (
            <View style={styles.tabContent}>
              <View style={styles.curriculumHeader}>
                <Text style={styles.sectionTitle}>Course Content</Text>
                <Text style={styles.curriculumMeta}>
                  {lessons.length} sections • {lessons.length} lectures •{" "}
                  {totalDuration} total length
                </Text>
              </View>

              {lessons.length > 0 ? (
                <View style={styles.lessonsList}>
                  {lessons.map((lesson, index) => (
                    <TouchableOpacity
                      key={lesson.id || index}
                      style={styles.lessonItem}
                      onPress={() => openVideoPlayer(lesson, index)}
                    >
                      <View style={styles.lessonLeft}>
                        <Ionicons
                          name={
                            isLessonCompleted(lesson.id || "")
                              ? "checkmark-circle"
                              : "play-circle-outline"
                          }
                          size={20}
                          color={
                            isLessonCompleted(lesson.id || "")
                              ? "#10B981"
                              : "#6a6f73"
                          }
                        />
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      </View>
                      <View style={styles.lessonRight}>
                        {lesson.duration && (
                          <Text style={styles.lessonDuration}>
                            {lesson.duration}
                          </Text>
                        )}
                        <Ionicons
                          name="lock-open-outline"
                          size={16}
                          color="#6a6f73"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="library-outline" size={64} color="#d1d7dc" />
                  <Text style={styles.emptyTitle}>No curriculum available</Text>
                  <Text style={styles.emptyText}>
                    The instructor hasn't added lessons yet.
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "reviews" && (
            <View style={styles.tabContent}>
              <View style={styles.reviewsHeader}>
                <View style={styles.reviewsOverview}>
                  <View style={styles.ratingOverview}>
                    {/* FIXED: Use formatted rating here too */}
                    <Text style={styles.averageRating}>
                      {formattedAverageRating}
                    </Text>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={
                            star <= Math.floor(averageRating)
                              ? "star"
                              : "star-outline"
                          }
                          size={20}
                          color="#e59819"
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingLabel}>Course Rating</Text>
                  </View>

                  <View style={styles.ratingBars}>
                    {ratingDistribution.map((item) => (
                      <View key={item.stars} style={styles.ratingBarRow}>
                        <View style={styles.ratingBarStars}>
                          {[...Array(item.stars)].map((_, i) => (
                            <Ionicons
                              key={i}
                              name="star"
                              size={12}
                              color="#e59819"
                            />
                          ))}
                        </View>
                        <View style={styles.ratingBar}>
                          <View
                            style={[
                              styles.ratingBarFill,
                              { width: `${item.percent}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.ratingBarPercent}>
                          {item.percent}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={openRatingModal}
                >
                  <Ionicons
                    name={userReview ? "star" : "star-outline"}
                    size={20}
                    color="#a435f0"
                  />
                  <Text style={styles.rateButtonText}>
                    {userReview ? "Update Rating" : "Rate this course"}
                  </Text>
                </TouchableOpacity>
              </View>

              {reviews.length > 0 ? (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review.id} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <Image
                          source={{
                            uri:
                              review.user_avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                review.user_name
                              )}&size=80&background=A435F0&color=fff`,
                          }}
                          style={styles.reviewAvatar}
                        />
                        <View style={styles.reviewInfo}>
                          <Text style={styles.reviewName}>
                            {review.user_name}
                            {review.user_id === user?.id && (
                              <Text style={styles.youBadge}> (You)</Text>
                            )}
                          </Text>
                          <View style={styles.reviewMeta}>
                            <View style={styles.reviewStars}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={
                                    star <= review.rating
                                      ? "star"
                                      : "star-outline"
                                  }
                                  size={14}
                                  color="#e59819"
                                />
                              ))}
                            </View>
                            <Text style={styles.reviewTime}>
                              {review.created_at
                                ? new Date(
                                    review.created_at
                                  ).toLocaleDateString()
                                : "Recently"}
                            </Text>
                          </View>
                        </View>
                        {review.user_id === user?.id && (
                          <TouchableOpacity onPress={deleteRating}>
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={64}
                    color="#d1d7dc"
                  />
                  <Text style={styles.emptyTitle}>No reviews yet</Text>
                  <Text style={styles.emptyText}>
                    Be the first to rate this course!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={openRatingModal}
                  >
                    <Text style={styles.emptyButtonText}>Rate Course</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.videoHeader}>
            <TouchableOpacity
              style={styles.videoBackButton}
              onPress={closeVideoPlayer}
            >
              <Ionicons name="close" size={24} color="#1c1d1f" />
            </TouchableOpacity>
            <View style={styles.videoTitleContainer}>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {currentLesson?.title}
              </Text>
              <Text style={styles.videoSubtitle}>
                Lesson {currentLessonIndex + 1} of {lessons.length}
              </Text>
            </View>
          </View>

          <View style={styles.videoPlayer}>
            {currentLesson ? (
              <VideoPlayer
                videoUrl={getVideoUrl(currentLesson)}
                lesson={currentLesson}
                onNext={navigateToNextLesson}
                onPrevious={navigateToPreviousLesson}
                hasNext={currentLessonIndex < lessons.length - 1}
                hasPrevious={currentLessonIndex > 0}
                onComplete={handleVideoComplete}
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons
                  name="play-circle-outline"
                  size={64}
                  color="#d1d7dc"
                />
                <Text style={styles.videoPlaceholderText}>
                  No video available
                </Text>
              </View>
            )}
          </View>

          <View style={styles.lessonInfo}>
            <View style={styles.lessonNavigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  !currentLessonIndex && styles.navButtonDisabled,
                ]}
                onPress={navigateToPreviousLesson}
                disabled={!currentLessonIndex}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={!currentLessonIndex ? "#d1d7dc" : "#1c1d1f"}
                />
                <Text
                  style={[
                    styles.navButtonText,
                    !currentLessonIndex && styles.navButtonTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={navigateToNextLesson}
              >
                <Text style={styles.nextButtonText}>
                  {currentLessonIndex >= lessons.length - 1
                    ? "Complete"
                    : "Next"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.lessonContent}>
              <Text style={styles.lessonTitle}>{currentLesson?.title}</Text>
              {currentLesson?.description && (
                <Text style={styles.lessonDescription}>
                  {currentLesson.description}
                </Text>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeRatingModal}
            >
              <Ionicons name="close" size={24} color="#1c1d1f" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rate this course</Text>
          </View>

          <View style={styles.ratingModalContent}>
            <Text style={styles.ratingQuestion}>
              How would you rate this course?
            </Text>

            <View style={styles.ratingStarsLarge}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={48}
                    color={star <= selectedRating ? "#e59819" : "#d1d7dc"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {selectedRating > 0 && (
              <View style={styles.ratingFeedback}>
                <Text style={styles.ratingText}>
                  {selectedRating === 5
                    ? "Excellent! 🤩"
                    : selectedRating === 4
                    ? "Very Good! 😊"
                    : selectedRating === 3
                    ? "Good! 🙂"
                    : selectedRating === 2
                    ? "Fair 😐"
                    : "Poor 😞"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitRatingButton,
                !selectedRating && styles.submitRatingButtonDisabled,
              ]}
              onPress={submitRating}
              disabled={!selectedRating || submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitRatingButtonText}>
                  {userReview ? "Update Rating" : "Submit Rating"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#6a6f73" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: "#4299E1",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 4,
  },
  errorButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Header
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d7dc",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackButton: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1c1d1f" },
  headerProgress: { marginLeft: 12 },
  headerProgressText: { fontSize: 14, color: "#4299E1", fontWeight: "600" },

  // Hero Section
  hero: {
    paddingTop:
      Platform.OS === "ios" ? 50 : (StatusBar.currentHeight || 0) + 10,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 0) + 20,
    left: 16,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroImageContainer: {
    width: "100%",
    height: 240,
    backgroundColor: "#f7f9fa",
  },
  heroImage: { width: "100%", height: "100%" },
  previewButton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  previewGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 8 },

  // Course Info
  courseInfo: { padding: 24 },
  courseBadge: {
    backgroundColor: "#eceb98",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  courseBadgeText: { fontSize: 12, fontWeight: "700", color: "#3d3c0a" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 17,
    color: "#1c1d1f",
    lineHeight: 24,
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ratingNumber: { fontSize: 16, fontWeight: "700", color: "#e59819" },
  stars: { flexDirection: "row", gap: 2 },
  ratingCount: { fontSize: 14, color: "#6a6f73" },
  studentCount: { fontSize: 14, color: "#6a6f73" },
  courseMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 14, color: "#6a6f73" },

  // CTA Section
  ctaSection: {
    padding: 24,
    backgroundColor: "#f7f9fa",
    borderTopWidth: 1,
    borderTopColor: "#d1d7dc",
  },
  progressCard: { marginBottom: 16 },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#d1d7dc",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#4299E1" },
  progressPercent: { fontSize: 14, fontWeight: "700", color: "#4299E1" },
  progressSubtitle: { fontSize: 14, color: "#6a6f73" },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4299E1",
    paddingVertical: 16,
    borderRadius: 4,
    gap: 8,
  },
  ctaButtonDisabled: { backgroundColor: "#d1d7dc" },
  ctaButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d7dc",
  },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1c1d1f" },
  tabText: { fontSize: 14, fontWeight: "700", color: "#6a6f73" },
  tabTextActive: { color: "#1c1d1f" },

  // Content
  content: { padding: 24 },
  tabContent: { gap: 24 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 12,
  },

  // Overview
  learningList: { gap: 12 },
  learningItem: { flexDirection: "row", gap: 12 },
  learningText: { flex: 1, fontSize: 15, color: "#1c1d1f", lineHeight: 22 },
  requirementsList: { gap: 8 },
  requirementItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  requirementText: { flex: 1, fontSize: 15, color: "#1c1d1f", lineHeight: 22 },

  // Curriculum
  curriculumHeader: { marginBottom: 16 },
  curriculumMeta: { fontSize: 14, color: "#6a6f73" },
  lessonsList: {
    gap: 1,
    backgroundColor: "#f7f9fa",
    borderRadius: 4,
    overflow: "hidden",
  },
  lessonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  lessonLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  lessonTitle: { fontSize: 15, color: "#1c1d1f", flex: 1 },
  lessonRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  lessonDuration: { fontSize: 13, color: "#6a6f73" },

  // Reviews
  reviewsHeader: { gap: 24 },
  reviewsOverview: { flexDirection: "row", gap: 32 },
  ratingOverview: { alignItems: "center", gap: 8 },
  averageRating: { fontSize: 48, fontWeight: "700", color: "#e59819" },
  ratingStars: { flexDirection: "row", gap: 2 },
  ratingLabel: { fontSize: 14, color: "#6a6f73" },
  ratingBars: { flex: 1, gap: 8 },
  ratingBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingBarStars: { flexDirection: "row", gap: 2, width: 60 },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#f7f9fa",
    borderRadius: 4,
    overflow: "hidden",
  },
  ratingBarFill: { height: "100%", backgroundColor: "#e59819" },
  ratingBarPercent: {
    fontSize: 12,
    color: "#6a6f73",
    width: 30,
    textAlign: "right",
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4299E1",
  },
  rateButtonText: { fontSize: 14, fontWeight: "700", color: "#4299E1" },
  reviewsList: { gap: 20 },
  reviewItem: {
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f7f9fa",
  },
  reviewHeader: { flexDirection: "row", gap: 12 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewInfo: { flex: 1 },
  reviewName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 4,
  },
  youBadge: { fontSize: 13, fontWeight: "600", color: "#4299E1" },
  reviewMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewTime: { fontSize: 13, color: "#6a6f73" },

  // Empty States
  emptyState: { alignItems: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1c1d1f" },
  emptyText: { fontSize: 15, color: "#6a6f73", textAlign: "center" },
  emptyButton: {
    backgroundColor: "#4299E1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  emptyButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Video Player Modal
  videoHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d7dc",
  },
  videoBackButton: { padding: 4, marginRight: 12 },
  videoTitleContainer: { flex: 1 },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 2,
  },
  videoSubtitle: { fontSize: 13, color: "#6a6f73" },
  videoPlayer: { height: 240, backgroundColor: "#000" },
  videoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  videoPlaceholderText: { color: "#fff", marginTop: 8 },
  lessonInfo: { flex: 1 },
  lessonNavigation: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f7f9fa",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1c1d1f",
    borderRadius: 4,
    gap: 8,
  },
  navButtonDisabled: { borderColor: "#d1d7dc" },
  navButtonText: { fontSize: 14, fontWeight: "700", color: "#1c1d1f" },
  navButtonTextDisabled: { color: "#d1d7dc" },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4299E1",
    paddingVertical: 12,
    borderRadius: 4,
    gap: 8,
  },
  nextButtonText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  lessonContent: { flex: 1, padding: 16 },
  lessonTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 12,
  },
  lessonDescription: { fontSize: 15, color: "#1c1d1f", lineHeight: 24 },

  // Rating Modal
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d7dc",
  },
  modalCloseButton: { padding: 4, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1c1d1f" },
  ratingModalContent: { padding: 24, alignItems: "center" },
  ratingQuestion: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1c1d1f",
    marginBottom: 32,
    textAlign: "center",
  },
  ratingStarsLarge: { flexDirection: "row", gap: 16, marginBottom: 32 },
  starButton: { padding: 4 },
  ratingFeedback: { marginBottom: 32 },
  ratingText: { fontSize: 18, fontWeight: "600", color: "#1c1d1f" },
  submitRatingButton: {
    backgroundColor: "#4299E1",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    width: "100%",
  },
  submitRatingButtonDisabled: { backgroundColor: "#d1d7dc" },
  submitRatingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
