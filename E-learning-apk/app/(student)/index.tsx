// app/(student)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { courseAPI, type Course } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function StudentHomeScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { user } = useAuth();

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Calculate responsive values
  const isSmallScreen = windowWidth < 375;
  const isTablet = windowWidth >= 768;
  const numColumns = isTablet ? 3 : 2;
  
  // Calculate card width based on screen size and columns
  const getCardWidth = () => {
    const horizontalPadding = 32; // 16px on each side
    const gap = 12; // gap between cards
    const totalGap = gap * (numColumns - 1);
    return (windowWidth - horizontalPadding - totalGap) / numColumns;
  };

  const cardWidth = getCardWidth();

  // Safe rating display function
  const getRatingDisplay = (rating: any): string => {
    if (rating === undefined || rating === null) {
      return "4.5"; // Default rating
    }
    
    // Ensure rating is a number before calling toFixed
    const numericRating = typeof rating === 'number' ? rating : parseFloat(rating);
    
    if (isNaN(numericRating)) {
      return "4.5"; // Default rating if parsing fails
    }
    
    return numericRating.toFixed(1);
  };

  // Safe instructor name function
  const getInstructorName = (course: Course): string => {
    // Handle different instructor data structures
    if (course.instructor_name) {
      return course.instructor_name;
    } else if (course.instructor?.name) {
      return course.instructor.name;
    } else if (course.created_by) {
      return "Instructor";
    }
    return "Instructor";
  };

  // Safe instructor initial function
  const getInstructorInitial = (course: Course): string => {
    const name = getInstructorName(course);
    return name.charAt(0).toUpperCase();
  };

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAllCourses(),
        loadFeaturedCourses(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Load all courses sorted by latest
  const loadAllCourses = async () => {
    const result = await courseAPI.getAllCourses();
    if (result.success && result.data?.courses) {
      // Sort courses by creation date (newest first)
      const sortedCourses = result.data.courses.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setCourses(sortedCourses);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(result.data.courses.map(course => course.category).filter(Boolean))
      ) as string[];
      setCategories(['all', ...uniqueCategories]);
    }
  };

  // Load featured courses
  const loadFeaturedCourses = async () => {
    const result = await courseAPI.getFeaturedCourses();
    if (result.success && result.data?.courses) {
      setFeaturedCourses(result.data.courses.slice(0, 4));
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and search courses
  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getInstructorName(course).toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Get user profile image or fallback to initials
  const getUserAvatarSource = () => {
    if (user?.avatar) {
      return { uri: user.avatar };
    }
    // Return a default avatar if no image is available
    return { uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face' };
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Course card component - Now responsive with grid
  const CourseCard = ({ course, type = 'normal' }: { course: Course; type?: 'featured' | 'normal' }) => {
    const isFeatured = type === 'featured';
    const cardStyle = [
      styles.courseCard,
      isFeatured && styles.featuredCourseCard,
      styles.cardShadow,
      { 
        width: isFeatured ? Math.min(320, windowWidth - 64) : cardWidth,
        marginHorizontal: isFeatured ? 8 : 0,
      }
    ];

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => router.push(`/components/course/${course.id || course.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.courseImageContainer}>
          <Image
            source={{
              uri: course.thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=300&h=200&fit=crop'
            }}
            style={[
              styles.courseImage,
              isFeatured && styles.featuredCourseImage
            ]} 
            resizeMode="cover"
          />
          
          {/* New Badge for recent courses */}
          {isNewCourse(course) && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          
          {/* Free/Price Badge */}
          <View style={styles.priceBadge}>
            {course.price === 0 || course.price === undefined ? (
              <Text style={styles.freeBadge}>FREE</Text>
            ) : (
              <Text style={styles.priceBadgeText}>${course.price}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.courseContent}>
          <View style={styles.courseHeader}>
            <View style={styles.categoryContainer}>
              <Ionicons name="bookmark-outline" size={isSmallScreen ? 10 : 12} color="#4299E1" />
              <Text style={[
                styles.courseCategory,
                isSmallScreen && styles.smallText
              ]} numberOfLines={1}>
                {course.category || 'General'}
              </Text>
            </View>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={isSmallScreen ? 12 : 14} color="#F6AD55" />
              <Text style={[
                styles.ratingText,
                isSmallScreen && styles.smallText
              ]}>
                {getRatingDisplay(course.rating)}
              </Text>
            </View>
          </View>
          
          <Text style={[
            styles.courseTitle,
            isFeatured && styles.featuredCourseTitle,
            isSmallScreen && styles.smallCourseTitle
          ]} numberOfLines={2}>
            {course.title}
          </Text>
          
          <Text style={[
            styles.courseDescription,
            isSmallScreen && styles.smallText
          ]} numberOfLines={isTablet ? 3 : 2}>
            {course.description}
          </Text>
          
          <View style={styles.courseMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={isSmallScreen ? 12 : 14} color="#718096" />
              <Text style={[
                styles.metaText,
                isSmallScreen && styles.smallText
              ]}>{course.duration || 'Self-paced'}</Text>
            </View>
            
            {!isSmallScreen && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={isSmallScreen ? 12 : 14} color="#718096" />
                <Text style={[
                  styles.metaText,
                  isSmallScreen && styles.smallText
                ]}>
                  {course.total_enrollments || course.enrolled_students?.length || 0}
                </Text>
              </View>
            )}
          </View>
          
          {!isSmallScreen && (
            <View style={styles.instructorContainer}>
              <View style={[
                styles.instructorAvatar,
                isSmallScreen && styles.smallInstructorAvatar
              ]}>
                <Text style={[
                  styles.instructorInitial,
                  isSmallScreen && styles.smallInstructorInitial
                ]}>
                  {getInstructorInitial(course)}
                </Text>
              </View>
              <Text style={[
                styles.instructorText,
                isSmallScreen && styles.smallText
              ]} numberOfLines={1}>
                {getInstructorName(course)}
              </Text>
            </View>
          )}
          
          {/* Course Level */}
          {course.level && (
            <View style={[
              styles.levelBadge,
              course.level === 'beginner' && styles.levelBeginner,
              course.level === 'intermediate' && styles.levelIntermediate,
              course.level === 'advanced' && styles.levelAdvanced,
            ]}>
              <Text style={[
                styles.levelText,
                isSmallScreen && styles.smallText
              ]}>
                {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Check if course is new (created within last 7 days)
  const isNewCourse = (course: Course) => {
    const createdAt = course.created_at || course.created_at;
    if (!createdAt) return false;
    const courseDate = new Date(createdAt).getTime();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return courseDate > sevenDaysAgo;
  };

  // Category chip component
  const CategoryChip = ({ category }: { category: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipSelected,
        isSmallScreen && styles.smallCategoryChip
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      {selectedCategory === category && (
        <Ionicons name="checkmark" size={isSmallScreen ? 14 : 16} color="#fff" style={styles.categoryIcon} />
      )}
      <Text style={[
        styles.categoryText,
        selectedCategory === category && styles.categoryTextSelected,
        isSmallScreen && styles.smallCategoryText
      ]} numberOfLines={1}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299E1" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={[
            styles.header,
            isSmallScreen && styles.smallHeader
          ]}>
            <View style={styles.headerContent}>
              <Text style={[
                styles.greeting,
                isSmallScreen && styles.smallGreeting
              ]}>Welcome back,</Text>
              <Text style={[
                styles.userName,
                isSmallScreen && styles.smallUserName
              ]}>{user?.name || 'Student'}! 👋</Text>
              <Text style={[
                styles.subtitle,
                isSmallScreen && styles.smallSubtitle
              ]}>
                Discover latest courses and enhance your skills
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/(student)/profile')}
            >
              {user?.avatar ? (
                <Image
                  source={getUserAvatarSource()}
                  style={[
                    styles.avatar,
                    isSmallScreen && styles.smallAvatar
                  ]}
                />
              ) : (
                <View style={[
                  styles.avatarFallback,
                  isSmallScreen && styles.smallAvatar
                ]}>
                  <Text style={styles.avatarFallbackText}>
                    {getUserInitials()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[
            styles.searchContainer,
            isSearchFocused && styles.searchContainerFocused,
            isSmallScreen && styles.smallSearchContainer
          ]}>
            <Ionicons name="search" size={isSmallScreen ? 18 : 20} color="#718096" />
            <TextInput
              style={[
                styles.searchInput,
                isSmallScreen && styles.smallSearchInput
              ]}
              placeholder="Search courses, categories, instructors..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={isSmallScreen ? 18 : 20} color="#A0AEC0" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Info */}
          {searchQuery.length > 0 && (
            <View style={styles.searchResultsInfo}>
              <Text style={[
                styles.searchResultsText,
                isSmallScreen && styles.smallText
              ]}>
                Found {filteredCourses.length} courses for "{searchQuery}"
              </Text>
              <TouchableOpacity onPress={clearSearch}>
                <Text style={[
                  styles.clearSearchText,
                  isSmallScreen && styles.smallText
                ]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Featured Courses Section */}
          {featuredCourses.length > 0 && searchQuery.length === 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="star" size={isSmallScreen ? 18 : 20} color="#F6AD55" />
                  <Text style={[
                    styles.sectionTitle,
                    isSmallScreen && styles.smallSectionTitle
                  ]}>Featured Courses</Text>
                </View>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                snapToInterval={isTablet ? (windowWidth - 64) / 2 : Math.min(320, windowWidth - 64) + 16}
                decelerationRate="fast"
              >
                {featuredCourses.map((course) => (
                  <CourseCard 
                    key={course.id || course.id} 
                    course={course} 
                    type="featured"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Categories Section */}
          {categories.length > 1 && searchQuery.length === 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="grid" size={isSmallScreen ? 18 : 20} color="#4299E1" />
                  <Text style={[
                    styles.sectionTitle,
                    isSmallScreen && styles.smallSectionTitle
                  ]}>Browse Categories</Text>
                </View>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {categories.map((category) => (
                  <CategoryChip key={category} category={category} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* All Courses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons 
                  name={searchQuery.length > 0 ? "search" : "library"} 
                  size={isSmallScreen ? 18 : 20} 
                  color="#48BB78" 
                />
                <Text style={[
                  styles.sectionTitle,
                  isSmallScreen && styles.smallSectionTitle
                ]}>
                  {searchQuery.length > 0 
                    ? 'Search Results' 
                    : selectedCategory === 'all' 
                      ? 'Latest Courses' 
                      : selectedCategory
                  }
                </Text>
              </View>
              <View style={styles.courseCountContainer}>
                <Text style={[
                  styles.courseCount,
                  isSmallScreen && styles.smallText
                ]}>
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
                </Text>
                {selectedCategory !== 'all' && searchQuery.length === 0 && (
                  <TouchableOpacity 
                    onPress={() => setSelectedCategory('all')}
                    style={styles.clearFilterButton}
                  >
                    <Text style={[
                      styles.clearFilterText,
                      isSmallScreen && styles.smallText
                    ]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {filteredCourses.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={searchQuery.length > 0 ? "search-outline" : "book-outline"} 
                  size={isSmallScreen ? 48 : 64} 
                  color="#CBD5E0" 
                />
                <Text style={[
                  styles.emptyStateTitle,
                  isSmallScreen && styles.smallEmptyStateTitle
                ]}>
                  {searchQuery.length > 0 ? 'No courses found' : 'No courses available'}
                </Text>
                <Text style={[
                  styles.emptyStateText,
                  isSmallScreen && styles.smallText
                ]}>
                  {searchQuery.length > 0 
                    ? `No courses found for "${searchQuery}". Try different keywords.`
                    : selectedCategory === 'all' 
                      ? 'Check back later for new courses.' 
                      : `No courses found in ${selectedCategory} category.`
                  }
                </Text>
                {(searchQuery.length > 0 || selectedCategory !== 'all') && (
                  <TouchableOpacity 
                    style={styles.emptyStateButton}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                  >
                    <Text style={styles.emptyStateButtonText}>View All Courses</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[
                styles.coursesGrid,
                { gap: 12 }
              ]}>
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id || course.id} course={course} />
                ))}
              </View> 
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  smallHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#718096',
  },
  smallGreeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 4,
  },
  smallUserName: {
    fontSize: 20,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  smallSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
    marginLeft: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4299E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  smallSearchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchContainerFocused: {
    borderColor: '#4299E1',
    shadowColor: '#4299E1',
    shadowOpacity: 0.2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2D3748',
    padding: 0,
  },
  smallSearchInput: {
    fontSize: 14,
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchResultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#4299E1',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginLeft: 8,
  },
  smallSectionTitle: {
    fontSize: 18,
    marginLeft: 6,
  },
  courseCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseCount: {
    fontSize: 14,
    color: '#718096',
    marginRight: 12,
  },
  clearFilterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFilterText: {
    fontSize: 14,
    color: '#4299E1',
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  smallCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryChipSelected: {
    backgroundColor: '#4299E1',
    borderColor: '#4299E1',
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
  },
  smallCategoryText: {
    fontSize: 12,
  },
  categoryTextSelected: {
    color: '#fff',
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  featuredCourseCard: {
    // Width is set dynamically
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  courseImageContainer: {
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: 120,
  },
  featuredCourseImage: {
    height: 160,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#48BB78',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  freeBadge: {
    fontSize: 8,
    color: '#48BB78',
    fontWeight: 'bold',
  },
  priceBadgeText: {
    fontSize: 8,
    color: '#2D3748',
    fontWeight: 'bold',
  },
  courseContent: {
    padding: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseCategory: {
    fontSize: 10,
    color: '#4299E1',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  ratingText: {
    fontSize: 10,
    color: '#744210',
    fontWeight: '600',
    marginLeft: 2,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 6,
    lineHeight: 18,
  },
  smallCourseTitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  featuredCourseTitle: {
    fontSize: 16,
  },
  courseDescription: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
    lineHeight: 16,
  },
  courseMeta: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 2,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4299E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  smallInstructorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  instructorInitial: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  smallInstructorInitial: {
    fontSize: 7,
  },
  instructorText: {
    fontSize: 10,
    color: '#718096',
    fontStyle: 'italic',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  levelBeginner: {
    backgroundColor: '#F0FFF4',
  },
  levelIntermediate: {
    backgroundColor: '#EBF8FF',
  },
  levelAdvanced: {
    backgroundColor: '#FFF5F5',
  },
  levelText: {
    fontSize: 8,
    fontWeight: '600',
  },
  coursesGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A5568',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  smallEmptyStateTitle: {
    fontSize: 14,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#4299E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 10,
  },
});