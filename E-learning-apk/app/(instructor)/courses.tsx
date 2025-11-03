import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Platform,
  UIManager,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  courseAPI,
  type Course,
  type Lesson,
  lessonAPI,
  uploadAPI,
} from "@/services/api";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isTablet = width >= 768;

// Categories array
const categories = [
  "Programming",
  "Design",
  "Business",
  "Marketing",
  "Photography",
  "Music",
  "Health & Fitness",
  "Lifestyle",
  "Other",
];

// --- Helper function to get course ID (PostgreSQL compatible) ---
const getCourseId = (course: Course): string => {
  return course.id || course._id || "";
};

// --- Helper function to get lesson ID (PostgreSQL compatible) ---
const getLessonId = (lesson: Lesson): string => {
  return lesson.id || lesson._id || "";
};

// --- Expandable Course Card Component ---
const ExpandableCourseCard = memo(
  ({
    course,
    onEdit,
    onDelete,
    onAddLesson,
    onEditLesson,
    onDeleteLesson,
    onViewCourse,
  }: {
    course: Course & { lessons?: Lesson[] };
    onEdit: (course: Course) => void;
    onDelete: (course: Course) => void;
    onAddLesson: (course: Course) => void;
    onEditLesson: (lesson: Lesson, course: Course) => void;
    onDeleteLesson: (lesson: Lesson, course: Course) => void;
    onViewCourse: (course: Course) => void;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [lessons, setLessons] = useState<Lesson[]>(course.lessons || []);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggleExpand = async () => {
      const courseId = getCourseId(course);

      if (!isExpanded && courseId && lessons.length === 0) {
        setLoadingLessons(true);
        try {
          const result = await lessonAPI.getLessonsByCourse(courseId);
          if (result.success && result.data?.lessons) {
            setLessons(result.data.lessons);
          }
        } catch (error) {
          console.error("Error fetching lessons:", error);
          Alert.alert("Error", "Failed to load lessons");
        } finally {
          setLoadingLessons(false);
        }
      }

      setIsExpanded(!isExpanded);
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    const handleCoursePress = () => {
      onViewCourse(course);
    };

    const arrowRotation = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "180deg"],
    });

    const getStatusColor = (status?: string) => {
      switch (status) {
        case "published":
          return "#10B981";
        case "draft":
          return "#F59E0B";
        case "archived":
          return "#EF4444";
        default:
          return "#6B7280";
      }
    };

    const getStatusText = (status?: string) => {
      switch (status) {
        case "published":
          return "Published";
        case "draft":
          return "Draft";
        case "archived":
          return "Archived";
        default:
          return "Draft";
      }
    };

    return (
      <View style={styles.courseCard}>
        {/* Course Header */}
        <View style={styles.courseHeader}>
          <TouchableOpacity
            style={styles.courseHeaderContent}
            onPress={handleCoursePress}
            activeOpacity={0.9}
          >
            <View style={styles.courseImageContainer}>
              {course.thumbnail ? (
                <Image
                  source={{ uri: course.thumbnail }}
                  style={styles.courseThumbnail}
                />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons
                    name="book-outline"
                    size={isSmallDevice ? 20 : 28}
                    color="#fff"
                  />
                </View>
              )}
            </View>

            <View style={styles.courseInfo}>
              <View style={styles.courseHeaderRow}>
                <View style={styles.courseTitleContainer}>
                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {course.title || "Untitled Course"}
                  </Text>
                  <View style={styles.courseMetaRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(course.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusText(course.status)}
                      </Text>
                    </View>
                    <Text style={styles.courseLevel}>
                      {course.level || "Beginner"}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.courseDescription} numberOfLines={2}>
                {course.description || "No description available"}
              </Text>

              <View style={styles.courseFooter}>
                <View style={styles.courseStats}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="play-circle-outline"
                      size={isSmallDevice ? 12 : 14}
                      color="#6B7280"
                    />
                    <Text style={styles.statText}>
                      {lessons.length} lessons
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="time-outline"
                      size={isSmallDevice ? 12 : 14}
                      color="#6B7280"
                    />
                    <Text style={styles.statText}>
                      {course.duration || "No duration"}
                    </Text>
                  </View>
                  {course.rating && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name="star"
                        size={isSmallDevice ? 12 : 14}
                        color="#F59E0B"
                      />
                      <Text style={styles.statText}>{course.rating}/5</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.coursePrice}>
                  {course.price === 0 ? "Free" : `$${course.price}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Action Icons */}
          <View style={styles.courseActionIcons}>
            <TouchableOpacity
              style={styles.courseActionIcon}
              onPress={() => onEdit(course)}
            >
              <Ionicons
                name="create-outline"
                size={isSmallDevice ? 18 : 20}
                color="#3B82F6"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.courseActionIcon}
              onPress={() => onDelete(course)}
            >
              <Ionicons
                name="trash-outline"
                size={isSmallDevice ? 18 : 20}
                color="#EF4444"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              style={styles.expandButton}
            >
              <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
                <Ionicons
                  name="chevron-down"
                  size={isSmallDevice ? 20 : 22}
                  color="#6B7280"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable Lessons Section */}
        {isExpanded && (
          <View style={styles.lessonsContainer}>
            <View style={styles.lessonsHeader}>
              <Text style={styles.lessonsTitle}>
                Course Lessons ({lessons.length})
              </Text>
              <TouchableOpacity
                style={styles.addLessonBtn}
                onPress={() => onAddLesson(course)}
              >
                <Ionicons
                  name="add"
                  size={isSmallDevice ? 16 : 18}
                  color="#fff"
                />
                <Text style={styles.addLessonBtnText}>Add Lesson</Text>
              </TouchableOpacity>
            </View>

            {loadingLessons ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading lessons...</Text>
              </View>
            ) : lessons.length > 0 ? (
              <View style={styles.lessonsList}>
                {lessons.map((lesson, index) => (
                  <View
                    key={getLessonId(lesson) || `lesson-${index}`}
                    style={styles.lessonItem}
                  >
                    <View style={styles.lessonNumber}>
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.lessonContent}>
                      <Text style={styles.lessonTitle}>
                        {lesson.title || "Untitled Lesson"}
                      </Text>
                      <Text style={styles.lessonDescription} numberOfLines={1}>
                        {lesson.description || "No description"}
                      </Text>
                      <View style={styles.lessonMeta}>
                        {lesson.duration && (
                          <View style={styles.lessonDuration}>
                            <Ionicons
                              name="time-outline"
                              size={isSmallDevice ? 10 : 12}
                              color="#6B7280"
                            />
                            <Text style={styles.lessonDurationText}>
                              {lesson.duration}
                            </Text>
                          </View>
                        )}
                        {lesson.isFree && (
                          <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>
                              Free Preview
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.lessonActions}>
                      <TouchableOpacity
                        style={styles.lessonActionBtn}
                        onPress={() => onEditLesson(lesson, course)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={isSmallDevice ? 16 : 18}
                          color="#3B82F6"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.lessonActionBtn}
                        onPress={() => onDeleteLesson(lesson, course)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={isSmallDevice ? 16 : 18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noLessons}>
                <Ionicons
                  name="document-text-outline"
                  size={isSmallDevice ? 36 : 48}
                  color="#D1D5DB"
                />
                <Text style={styles.noLessonsText}>No lessons yet</Text>
                <Text style={styles.noLessonsSubtext}>
                  Add your first lesson to get started
                </Text>
              </View>
            )}

            {/* Course Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => onEdit(course)}
              >
                <Ionicons
                  name="create-outline"
                  size={isSmallDevice ? 14 : 16}
                  color="#fff"
                />
                <Text style={styles.actionBtnText}>Edit Course</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => onDelete(course)}
              >
                <Ionicons
                  name="trash-outline"
                  size={isSmallDevice ? 14 : 16}
                  color="#fff"
                />
                <Text style={styles.actionBtnText}>Delete Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
);

// --- Enhanced Universal Modal ---
const UniversalModal = ({
  visible,
  type,
  course,
  lesson,
  onClose,
  onSave,
}: {
  visible: boolean;
  type: "course" | "lesson";
  course?: Course | null;
  lesson?: Lesson | null;
  onClose: () => void;
  onSave: (data: any, isFileUpload?: boolean) => void;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Programming",
    thumbnail: "",
    price: "",
    level: "beginner",
    status: "draft",
    duration: "",
    videoUrl: "",
    isFree: false,
    content: "",
    requirements: [""],
    whatYouWillLearn: [""],
  });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [thumbnailSource, setThumbnailSource] = useState<"url" | "upload">(
    "url"
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (type === "course") {
      if (course) {
        setFormData({
          title: course.title || "",
          description: course.description || "",
          category: course.category || "Programming",
          thumbnail: course.thumbnail || "",
          price: course.price?.toString() || "0",
          level: course.level || "beginner",
          status: course.status || "draft",
          duration: course.duration || "",
          videoUrl: "",
          isFree: false,
          content: "",
          requirements: course.requirements?.length
            ? course.requirements
            : [""],
          whatYouWillLearn: course.whatYouWillLearn?.length
            ? course.whatYouWillLearn
            : [""],
        });
        setSelectedImage(course.thumbnail || null);
      } else {
        setFormData({
          title: "",
          description: "",
          category: "Programming",
          thumbnail: "",
          price: "0",
          level: "beginner",
          status: "draft",
          duration: "",
          videoUrl: "",
          isFree: false,
          content: "",
          requirements: [""],
          whatYouWillLearn: [""],
        });
        setSelectedImage(null);
      }
    } else if (type === "lesson") {
      if (lesson) {
        setFormData({
          title: lesson.title || "",
          description: lesson.description || "",
          category: "Programming",
          thumbnail: "",
          price: "",
          level: "beginner",
          status: "draft",
          duration: lesson.duration || "",
          videoUrl: lesson.videoUrl || lesson.youtubeUrl || "",
          isFree: lesson.isFree || false,
          content: lesson.content || "",
          requirements: [""],
          whatYouWillLearn: [""],
        });
      } else {
        setFormData({
          title: "",
          description: "",
          category: "Programming",
          thumbnail: "",
          price: "",
          level: "beginner",
          status: "draft",
          duration: "",
          videoUrl: "",
          isFree: false,
          content: "",
          requirements: [""],
          whatYouWillLearn: [""],
        });
      }
    }
    setThumbnailSource("url");
  }, [type, course, lesson, visible]);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Sorry, we need camera roll permissions to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setThumbnailSource("upload");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || thumbnailSource !== "upload") return null;

    try {
      setUploading(true);

      // Create FormData for the image
      const formData = new FormData();
      formData.append("image", {
        uri: selectedImage,
        type: "image/jpeg",
        name: "course-thumbnail.jpg",
      } as any);

      console.log("🔄 Attempting to upload image...");

      // Try multiple upload approaches
      let result;

      // Approach 1: Try the course image upload endpoint
      result = await uploadAPI.uploadCourseImage(formData);

      // Approach 2: If that fails, try the generic upload method
      if (!result.success) {
        console.log("📤 Course image upload failed, trying generic upload...");
        result = await uploadAPI.uploadImage(formData, "course");
      }

      // Approach 3: If still failing, try uploading as part of course creation/update
      if (!result.success) {
        console.log(
          "📤 Generic upload failed, will handle image in course save..."
        );
        // Return the local image URI to be handled in course creation
        return selectedImage;
      }

      if (result.success && result.data?.url) {
        console.log("✅ Image uploaded successfully:", result.data.url);
        return result.data.url;
      } else {
        throw new Error(result.error?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload image. Please try again or use a URL instead."
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert(
        "Error",
        `${type === "course" ? "Course" : "Lesson"} title is required`
      );
      return;
    }

    setLoading(true);

    try {
      let finalThumbnail = formData.thumbnail;

      // Handle image upload differently based on the approach
      if (type === "course" && thumbnailSource === "upload" && selectedImage) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          finalThumbnail = uploadedUrl;
        } else {
          // If upload failed but we have a local image, we'll handle it in the course API
          console.log("📝 Using local image for course creation");
          finalThumbnail = selectedImage;
        }
      }

      const saveData =
        type === "course"
          ? {
              title: formData.title,
              description: formData.description,
              category: formData.category,
              thumbnail: finalThumbnail || undefined,
              price: formData.price ? parseInt(formData.price) : 0,
              level: formData.level,
              status: formData.status,
              duration: formData.duration,
              requirements: formData.requirements.filter((req) => req.trim()),
              whatYouWillLearn: formData.whatYouWillLearn.filter((learn) =>
                learn.trim()
              ),
            }
          : {
              title: formData.title,
              description: formData.description,
              duration: formData.duration,
              videoUrl: formData.videoUrl,
              youtubeUrl: formData.videoUrl,
              isFree: formData.isFree,
              content: formData.content,
            };

      await onSave(saveData, thumbnailSource === "upload");
    } catch (error) {
      console.error("Error saving:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    if (type === "course") {
      return course ? "Edit Course" : "Create New Course";
    } else {
      return lesson ? "Edit Lesson" : "Add New Lesson";
    }
  };

  const addRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ""],
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((req, i) =>
        i === index ? value : req
      ),
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const addLearningPoint = () => {
    setFormData((prev) => ({
      ...prev,
      whatYouWillLearn: [...prev.whatYouWillLearn, ""],
    }));
  };

  const updateLearningPoint = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      whatYouWillLearn: prev.whatYouWillLearn.map((point, i) =>
        i === index ? value : point
      ),
    }));
  };

  const removeLearningPoint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      whatYouWillLearn: prev.whatYouWillLearn.filter((_, i) => i !== index),
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{getModalTitle()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons
              name="close"
              size={isSmallDevice ? 20 : 24}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContentContainer}
        >
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {type === "course" ? "Course Title" : "Lesson Title"} *
            </Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, title: text }))
              }
              placeholder={`Enter ${
                type === "course" ? "course" : "lesson"
              } title`}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder={`Describe this ${
                type === "course" ? "course" : "lesson"
              }`}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Course Specific Fields */}
          {type === "course" && (
            <>
              {/* Thumbnail Section */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Thumbnail</Text>

                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      thumbnailSource === "url" && styles.toggleOptionActive,
                    ]}
                    onPress={() => setThumbnailSource("url")}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        thumbnailSource === "url" && styles.toggleTextActive,
                      ]}
                    >
                      URL
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      thumbnailSource === "upload" && styles.toggleOptionActive,
                    ]}
                    onPress={() => setThumbnailSource("upload")}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        thumbnailSource === "upload" && styles.toggleTextActive,
                      ]}
                    >
                      Upload
                    </Text>
                  </TouchableOpacity>
                </View>

                {thumbnailSource === "url" && (
                  <TextInput
                    style={styles.input}
                    value={formData.thumbnail}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, thumbnail: text }))
                    }
                    placeholder="https://example.com/image.jpg"
                    placeholderTextColor="#9CA3AF"
                  />
                )}

                {thumbnailSource === "upload" && (
                  <View style={styles.uploadSection}>
                    {selectedImage ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image
                          source={{ uri: selectedImage }}
                          style={styles.imagePreview}
                        />
                        <TouchableOpacity
                          style={styles.changeImageBtn}
                          onPress={pickImage}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.changeImageText}>
                              Change Image
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadPlaceholder}
                        onPress={pickImage}
                      >
                        <Ionicons
                          name="image-outline"
                          size={isSmallDevice ? 24 : 32}
                          color="#3B82F6"
                        />
                        <Text style={styles.uploadPlaceholderText}>
                          Tap to select image
                        </Text>
                        <Text style={styles.uploadPlaceholderSubtext}>
                          Recommended: 16:9 ratio
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Thumbnail Preview */}
                {(formData.thumbnail || selectedImage) && (
                  <View style={styles.thumbnailPreview}>
                    <Text style={styles.previewLabel}>Preview:</Text>
                    <Image
                      source={{ uri: selectedImage || formData.thumbnail }}
                      style={styles.thumbnailPreviewImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                    style={styles.picker}
                  >
                    {categories.map((category) => (
                      <Picker.Item
                        key={category}
                        label={category}
                        value={category}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Price & Duration */}
              <View style={styles.row}>
                <View
                  style={[
                    styles.formGroup,
                    { flex: 1, marginRight: isSmallDevice ? 8 : 12 },
                  ]}
                >
                  <Text style={styles.label}>Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: text.replace(/[^0-9]/g, ""),
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Duration</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.duration}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, duration: text }))
                    }
                    placeholder="e.g., 10 hours"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Level & Status */}
              <View style={styles.column}>
                <View
                  style={[
                    styles.formGroup,
                    { flex: 1, marginRight: isSmallDevice ? 8 : 12 },
                  ]}
                >
                  <Text style={styles.label}>Level</Text>
                  <View style={styles.radioGroup}>
                    {["beginner", "intermediate", "advanced"].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={styles.radioOption}
                        onPress={() =>
                          setFormData((prev) => ({ ...prev, level }))
                        }
                      >
                        <View style={styles.radioCircle}>
                          {formData.level === level && (
                            <View style={styles.radioDot} />
                          )}
                        </View>
                        <Text style={styles.radioText}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.radioGroup}>
                    {["draft", "published"].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={styles.radioOption}
                        onPress={() =>
                          setFormData((prev) => ({ ...prev, status }))
                        }
                      >
                        <View style={styles.radioCircle}>
                          {formData.status === status && (
                            <View style={styles.radioDot} />
                          )}
                        </View>
                        <Text style={styles.radioText}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Requirements */}
              <View style={styles.formGroup}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>Requirements</Text>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={addRequirement}
                  >
                    <Ionicons
                      name="add"
                      size={isSmallDevice ? 14 : 16}
                      color="#3B82F6"
                    />
                    <Text style={styles.addItemText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.requirements.map((requirement, index) => (
                  <View key={index} style={styles.listItem}>
                    <TextInput
                      style={[styles.input, styles.listInput]}
                      value={requirement}
                      onChangeText={(text) => updateRequirement(index, text)}
                      placeholder={`Requirement ${index + 1}`}
                      placeholderTextColor="#9CA3AF"
                    />
                    {formData.requirements.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeItemBtn}
                        onPress={() => removeRequirement(index)}
                      >
                        <Ionicons
                          name="close"
                          size={isSmallDevice ? 16 : 18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* What You'll Learn */}
              <View style={styles.formGroup}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>What Students Will Learn</Text>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={addLearningPoint}
                  >
                    <Ionicons
                      name="add"
                      size={isSmallDevice ? 14 : 16}
                      color="#3B82F6"
                    />
                    <Text style={styles.addItemText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {formData.whatYouWillLearn.map((point, index) => (
                  <View key={index} style={styles.listItem}>
                    <TextInput
                      style={[styles.input, styles.listInput]}
                      value={point}
                      onChangeText={(text) => updateLearningPoint(index, text)}
                      placeholder={`Learning point ${index + 1}`}
                      placeholderTextColor="#9CA3AF"
                    />
                    {formData.whatYouWillLearn.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeItemBtn}
                        onPress={() => removeLearningPoint(index)}
                      >
                        <Ionicons
                          name="close"
                          size={isSmallDevice ? 16 : 18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Lesson Specific Fields */}
          {type === "lesson" && (
            <>
              {/* Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Duration</Text>
                <TextInput
                  style={styles.input}
                  value={formData.duration}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, duration: text }))
                  }
                  placeholder="e.g., 10:30, 15 minutes"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Video URL */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Video URL</Text>
                <TextInput
                  style={styles.input}
                  value={formData.videoUrl}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, videoUrl: text }))
                  }
                  placeholder="https://example.com/video.mp4 or YouTube URL"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Content */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Lesson Content</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.content}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, content: text }))
                  }
                  placeholder="Detailed lesson content, notes, or transcript..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Free Lesson */}
              <View style={styles.switchContainer}>
                <View>
                  <Text style={styles.switchLabel}>Free Preview Lesson</Text>
                  <Text style={styles.switchDescription}>
                    Allow non-enrolled students to view this lesson
                  </Text>
                </View>
                <Switch
                  value={formData.isFree}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, isFree: value }))
                  }
                  trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                  thumbColor="#fff"
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={loading || uploading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (loading || uploading) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {type === "course"
                  ? course
                    ? "Update Course"
                    : "Create Course"
                  : lesson
                  ? "Update Lesson"
                  : "Add Lesson"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// --- Main Screen Component ---
const InstructorCoursesScreen = () => {
  const [courses, setCourses] = useState<(Course & { lessons?: Lesson[] })[]>(
    []
  );
  const [filteredCourses, setFilteredCourses] = useState<
    (Course & { lessons?: Lesson[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"course" | "lesson">("course");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Load courses
  const loadCourses = useCallback(
    async (isInitialLoad = false) => {
      try {
        if (isInitialLoad && !refreshing) setLoading(true);

        const result = await courseAPI.getInstructorCourses();

        if (result.success && result.data?.courses) {
          setCourses(result.data.courses);
          setFilteredCourses(result.data.courses);
        } else {
          setCourses([]);
          setFilteredCourses([]);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
        setCourses([]);
        setFilteredCourses([]);
        if (!refreshing) {
          Alert.alert("Error", "Failed to load courses. Please try again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing]
  );

  // Filter courses
  const filterCourses = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredCourses(courses);
        return;
      }

      const lowercasedQuery = query.toLowerCase();
      const filtered = courses.filter(
        (course) =>
          course.title?.toLowerCase().includes(lowercasedQuery) ||
          course.description?.toLowerCase().includes(lowercasedQuery) ||
          course.category?.toLowerCase().includes(lowercasedQuery)
      );

      setFilteredCourses(filtered);
    },
    [courses]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      filterCourses(query);
    },
    [filterCourses]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setFilteredCourses(courses);
  }, [courses]);

  useEffect(() => {
    loadCourses(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCourses(false);
  }, [loadCourses]);

  // NEW: Create course redirects to create-post page
  const handleCreateCourse = useCallback(() => {
    router.push("/(instructor)/create-course");
  }, []);

  // Course Actions
  const handleEditCourse = useCallback((course: Course) => {
    setModalType("course");
    setSelectedCourse(course);
    setSelectedLesson(null);
    setModalVisible(true);
  }, []);

  const handleDeleteCourse = useCallback(
    (course: Course) => {
      const courseId = getCourseId(course);
      if (!courseId) {
        Alert.alert("Error", "Invalid course ID");
        return;
      }

      Alert.alert(
        "Delete Course",
        `Are you sure you want to delete "${course.title}"? This will also delete all lessons in this course.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const result = await courseAPI.deleteCourse(courseId);
                if (result.success) {
                  Alert.alert("Success", "Course deleted successfully!");
                  loadCourses(false);
                } else {
                  Alert.alert(
                    "Error",
                    result.error?.message || "Failed to delete course"
                  );
                }
              } catch (error) {
                console.error("Error deleting course:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete course. Please try again."
                );
              }
            },
          },
        ]
      );
    },
    [loadCourses]
  );

  // Lesson Actions
  const handleAddLesson = useCallback((course: Course) => {
    setModalType("lesson");
    setSelectedCourse(course);
    setSelectedLesson(null);
    setModalVisible(true);
  }, []);

  const handleEditLesson = useCallback((lesson: Lesson, course: Course) => {
    setModalType("lesson");
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setModalVisible(true);
  }, []);

  const handleDeleteLesson = useCallback(
    (lesson: Lesson, course: Course) => {
      const courseId = getCourseId(course);
      const lessonId = getLessonId(lesson);

      if (!courseId || !lessonId) {
        Alert.alert("Error", "Invalid course or lesson ID");
        return;
      }

      Alert.alert(
        "Delete Lesson",
        `Are you sure you want to delete "${lesson.title}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const result = await lessonAPI.deleteLesson(courseId, lessonId);
                if (result.success) {
                  Alert.alert("Success", "Lesson deleted successfully!");
                  loadCourses(false);
                } else {
                  Alert.alert(
                    "Error",
                    result.error?.message || "Failed to delete lesson"
                  );
                }
              } catch (error) {
                console.error("Error deleting lesson:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete lesson. Please try again."
                );
              }
            },
          },
        ]
      );
    },
    [loadCourses]
  );

  // Handle course view/redirect
  const handleViewCourse = useCallback((course: Course) => {}, []);

  // Save Operations - FIXED: Proper course ID handling
  const handleSave = useCallback(
    async (data: any, isFileUpload = false) => {
      try {
        let result;

        if (modalType === "course") {
          if (selectedCourse) {
            // Update existing course
            const courseId = getCourseId(selectedCourse);
            if (!courseId) {
              Alert.alert("Error", "Invalid course ID");
              return;
            }
            result = await courseAPI.updateCourse(courseId, data);
          } else {
            // This shouldn't happen since we redirect for new courses, but keep as fallback
            result = await courseAPI.createCourse(data);
          }
        } else {
          if (selectedLesson) {
            // Update existing lesson
            const courseId = getCourseId(selectedCourse!);
            const lessonId = getLessonId(selectedLesson);

            if (!courseId || !lessonId) {
              Alert.alert("Error", "Invalid course or lesson ID");
              return;
            }

            result = await lessonAPI.updateLesson(courseId, lessonId, data);
          } else {
            // Create new lesson
            const courseId = getCourseId(selectedCourse!);
            if (!courseId) {
              Alert.alert("Error", "Invalid course ID");
              return;
            }

            result = await lessonAPI.createLesson(courseId, data);
          }
        }

        if (result.success) {
          const action =
            modalType === "course"
              ? selectedCourse
                ? "updated"
                : "created"
              : selectedLesson
              ? "updated"
              : "added";

          Alert.alert(
            "Success",
            `${
              modalType === "course" ? "Course" : "Lesson"
            } ${action} successfully!`
          );
          setModalVisible(false);
          setSelectedCourse(null);
          setSelectedLesson(null);
          loadCourses(false);
        } else {
          Alert.alert(
            "Error",
            result.error?.message ||
              `Failed to ${
                selectedCourse || selectedLesson ? "update" : "create"
              } ${modalType}`
          );
        }
      } catch (error) {
        console.error("Error saving:", error);
        Alert.alert(
          "Error",
          `Failed to ${
            selectedCourse || selectedLesson ? "update" : "create"
          } ${modalType}. Please try again.`
        );
      }
    },
    [modalType, selectedCourse, selectedLesson, loadCourses]
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>My Courses</Text>
        <TouchableOpacity
          style={styles.createCourseBtn}
          onPress={handleCreateCourse}
        >
          <Ionicons name="add" size={isSmallDevice ? 18 : 20} color="#fff" />
          <Text style={styles.createCourseText}>New Course</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={isSmallDevice ? 16 : 18}
          color="#6B7280"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your courses..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons
              name="close-circle"
              size={isSmallDevice ? 16 : 18}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredCourses.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCourses.filter((c) => c.status === "published").length}
          </Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredCourses.reduce(
              (total, course) => total + (course.lessons?.length || 0),
              0
            )}
          </Text>
          <Text style={styles.statLabel}>Lessons</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="book-outline"
          size={isSmallDevice ? 48 : 64}
          color="#D1D5DB"
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? "No Courses Found" : "No Courses Yet"}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery
          ? "Try adjusting your search terms"
          : "Create your first course to start teaching"}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleCreateCourse}
        >
          <Text style={styles.emptyButtonText}>Create Your First Course</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCourses}
        renderItem={({ item }) => (
          <ExpandableCourseCard
            course={item}
            onEdit={handleEditCourse}
            onDelete={handleDeleteCourse}
            onAddLesson={handleAddLesson}
            onEditLesson={handleEditLesson}
            onDeleteLesson={handleDeleteLesson}
            onViewCourse={handleViewCourse}
          />
        )}
        keyExtractor={(item) => getCourseId(item)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      />

      {/* Universal Modal - Only used for editing courses and lesson operations */}
      <UniversalModal
        visible={modalVisible}
        type={modalType}
        course={selectedCourse}
        lesson={selectedLesson}
        onClose={() => {
          setModalVisible(false);
          setSelectedCourse(null);
          setSelectedLesson(null);
        }}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    marginBottom: 60,
  },
  listContent: {
    paddingBottom: isSmallDevice ? 16 : 20,
    paddingTop: isSmallDevice ? 8 : 0,
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallDevice ? 12 : 16,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: "bold",
    color: "#111827",
  },
  createCourseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 8 : 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createCourseText: {
    color: "#fff",
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 10 : 12,
    marginBottom: isSmallDevice ? 12 : 16,
    height: isSmallDevice ? 40 : 44,
  },
  searchIcon: {
    marginRight: isSmallDevice ? 6 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#111827",
    paddingVertical: isSmallDevice ? 6 : 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  courseCard: {
    backgroundColor: "#fff",
    marginHorizontal: isSmallDevice ? 12 : 20,
    marginVertical: isSmallDevice ? 6 : 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  courseHeader: {
    flexDirection: "row",
    padding: isSmallDevice ? 16 : 20,
    alignItems: "flex-start",
  },
  courseHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  courseImageContainer: {
    marginRight: isSmallDevice ? 12 : 16,
  },
  courseThumbnail: {
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 45 : 60,
    borderRadius: 12,
  },
  thumbnailPlaceholder: {
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 45 : 60,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    flex: 1,
  },
  courseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: isSmallDevice ? 6 : 8,
  },
  courseTitleContainer: {
    flex: 1,
    marginRight: isSmallDevice ? 8 : 12,
  },
  courseTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: isSmallDevice ? 4 : 6,
    lineHeight: isSmallDevice ? 20 : 24,
  },
  courseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 6 : 8,
  },
  statusBadge: {
    paddingHorizontal: isSmallDevice ? 6 : 8,
    paddingVertical: isSmallDevice ? 2 : 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: isSmallDevice ? 8 : 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  courseLevel: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  courseActionIcons: {
    flexDirection: "column",
    alignItems: "center",
    gap: isSmallDevice ? 8 : 12,
    marginLeft: isSmallDevice ? 6 : 8,
  },
  courseActionIcon: {
    padding: isSmallDevice ? 4 : 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  expandButton: {
    padding: 2,
  },
  courseDescription: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#6B7280",
    marginBottom: isSmallDevice ? 8 : 12,
    lineHeight: isSmallDevice ? 16 : 20,
  },
  courseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 12 : 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  statText: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
  },
  coursePrice: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    color: "#059669",
  },
  lessonsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: isSmallDevice ? 16 : 20,
  },
  lessonsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallDevice ? 12 : 16,
  },
  lessonsTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "600",
    color: "#111827",
  },
  addLessonBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 6 : 8,
    borderRadius: 8,
    gap: 4,
  },
  addLessonBtnText: {
    color: "#fff",
    fontSize: isSmallDevice ? 10 : 12,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: isSmallDevice ? 16 : 20,
    alignItems: "center",
    gap: isSmallDevice ? 8 : 12,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: isSmallDevice ? 12 : 14,
  },
  lessonsList: {
    gap: isSmallDevice ? 8 : 12,
  },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: isSmallDevice ? 12 : 16,
    borderRadius: 12,
    gap: isSmallDevice ? 8 : 12,
  },
  lessonNumber: {
    width: isSmallDevice ? 28 : 36,
    height: isSmallDevice ? 28 : 36,
    borderRadius: isSmallDevice ? 14 : 18,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  lessonNumberText: {
    color: "#fff",
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "600",
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  lessonDescription: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#6B7280",
    marginBottom: isSmallDevice ? 6 : 8,
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 8 : 12,
  },
  lessonDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  lessonDurationText: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
  },
  freeBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: isSmallDevice ? 6 : 8,
    paddingVertical: isSmallDevice ? 2 : 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: "#fff",
    fontSize: isSmallDevice ? 8 : 10,
    fontWeight: "500",
  },
  lessonActions: {
    flexDirection: "row",
    gap: isSmallDevice ? 6 : 8,
  },
  lessonActionBtn: {
    padding: isSmallDevice ? 6 : 8,
  },
  noLessons: {
    alignItems: "center",
    padding: isSmallDevice ? 24 : 40,
    gap: isSmallDevice ? 12 : 16,
  },
  noLessonsText: {
    fontSize: isSmallDevice ? 16 : 18,
    color: "#6B7280",
    fontWeight: "500",
  },
  noLessonsSubtext: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 12,
    marginTop: isSmallDevice ? 16 : 20,
    paddingTop: isSmallDevice ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 8,
    gap: 4,
  },
  editBtn: {
    backgroundColor: "#3B82F6",
  },
  deleteBtn: {
    backgroundColor: "#EF4444",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    padding: isSmallDevice ? 32 : 48,
    marginTop: isSmallDevice ? 20 : 40,
  },
  emptyIcon: {
    marginBottom: isSmallDevice ? 12 : 16,
  },
  emptyTitle: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: isSmallDevice ? 6 : 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: isSmallDevice ? 16 : 24,
    lineHeight: isSmallDevice ? 20 : 24,
  },
  emptyButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: isSmallDevice ? 20 : 24,
    paddingVertical: isSmallDevice ? 10 : 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "600",
    color: "#111827",
  },
  closeBtn: {
    padding: 2,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: isSmallDevice ? 16 : 20,
  },
  modalActions: {
    flexDirection: "row",
    padding: isSmallDevice ? 16 : 20,
    gap: isSmallDevice ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: isSmallDevice ? 10 : 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "500",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: isSmallDevice ? 10 : 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
  },
  formGroup: {
    marginBottom: isSmallDevice ? 16 : 20,
  },
  column: {
    flexDirection: "column",
  },
  label: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: isSmallDevice ? 6 : 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 8 : 10,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: isSmallDevice ? 80 : 100,
    textAlignVertical: "top",
  },
  toggleContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginBottom: isSmallDevice ? 8 : 12,
    overflow: "hidden",
  },
  toggleOption: {
    flex: 1,
    paddingVertical: isSmallDevice ? 8 : 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  toggleOptionActive: {
    backgroundColor: "#3B82F6",
  },
  toggleText: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  toggleTextActive: {
    color: "#fff",
  },
  uploadSection: {
    marginBottom: isSmallDevice ? 8 : 12,
  },
  imagePreviewContainer: {
    alignItems: "center",
    gap: isSmallDevice ? 8 : 12,
  },
  imagePreview: {
    width: "100%",
    height: isSmallDevice ? 150 : 200,
    borderRadius: 8,
  },
  changeImageBtn: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 6 : 8,
    backgroundColor: "#3B82F6",
    borderRadius: 6,
    minWidth: isSmallDevice ? 100 : 120,
  },
  changeImageText: {
    color: "#fff",
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "500",
    textAlign: "center",
  },
  uploadPlaceholder: {
    alignItems: "center",
    padding: isSmallDevice ? 24 : 32,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  uploadPlaceholderText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#3B82F6",
    fontWeight: "500",
    marginTop: 6,
  },
  uploadPlaceholderSubtext: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
    marginTop: 2,
  },
  thumbnailPreview: {
    marginTop: 6,
  },
  previewLabel: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  thumbnailPreviewImage: {
    width: "100%",
    height: isSmallDevice ? 80 : 120,
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    backgroundColor: "#fff",
  },
  radioGroup: {
    flexDirection: "row",
    gap: isSmallDevice ? 12 : 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 6 : 8,
  },
  radioCircle: {
    width: isSmallDevice ? 16 : 20,
    height: isSmallDevice ? 16 : 20,
    borderRadius: isSmallDevice ? 8 : 10,
    borderWidth: 2,
    borderColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: {
    width: isSmallDevice ? 6 : 10,
    height: isSmallDevice ? 6 : 10,
    borderRadius: isSmallDevice ? 3 : 5,
    backgroundColor: "#3B82F6",
  },
  radioText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#374151",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: "500",
    color: "#374151",
  },
  switchDescription: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#6B7280",
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallDevice ? 8 : 12,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: isSmallDevice ? 6 : 8,
    paddingVertical: isSmallDevice ? 2 : 4,
  },
  addItemText: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 6 : 8,
    marginBottom: isSmallDevice ? 6 : 8,
  },
  listInput: {
    flex: 1,
  },
  removeItemBtn: {
    padding: 2,
  },
});

export default InstructorCoursesScreen;
