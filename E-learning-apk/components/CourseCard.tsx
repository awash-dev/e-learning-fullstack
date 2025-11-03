// components/CourseCard.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Course } from '@/services/api';
import { router } from 'expo-router';

interface CourseCardProps {
  course: Course;
  variant?: 'default' | 'small' | 'featured';
  onPress?: (course: Course) => void;
}

const { width } = Dimensions.get('window');

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  variant = 'default',
  onPress 
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(course);
    } else {
      router.push(`/courses/${course._id}`);
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getLevelIcon = (level?: string) => {
    switch (level) {
      case 'beginner': return 'play-circle';
      case 'intermediate': return 'rocket';
      case 'advanced': return 'trophy';
      default: return 'play-circle';
    }
  };

  if (variant === 'small') {
    return (
      <TouchableOpacity 
        style={styles.smallCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ 
            uri: course.thumbnail || 'https://via.placeholder.com/150x100/667eea/ffffff?text=Course'
          }}
          style={styles.smallThumbnail}
        />
        <View style={styles.smallContent}>
          <Text style={styles.smallTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.smallInstructor} numberOfLines={1}>
            {course.instructor?.name || 'Unknown Instructor'}
          </Text>
          <View style={styles.smallFooter}>
            <Text style={styles.smallPrice}>
              {course.price === 0 ? 'Free' : `$${course.price}`}
            </Text>
            <View style={styles.smallRating}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.smallRatingText}>
                {course.rating?.toFixed(1) || '4.5'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'featured') {
    return (
      <TouchableOpacity 
        style={styles.featuredCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ 
            uri: course.thumbnail || 'https://via.placeholder.com/300x200/667eea/ffffff?text=Featured+Course'
          }}
          style={styles.featuredThumbnail}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.featuredGradient}
        >
          <View style={styles.featuredBadge}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.featuredDescription} numberOfLines={2}>
            {course.description}
          </Text>
          <View style={styles.featuredFooter}>
            <View style={styles.featuredInstructor}>
              <Text style={styles.featuredInstructorText}>
                By {course.instructor?.name || 'Unknown Instructor'}
              </Text>
            </View>
            <View style={styles.featuredStats}>
              <View style={styles.stat}>
                <Ionicons name="people" size={14} color="#fff" />
                <Text style={styles.statText}>
                  {course.enrolledStudents || 0}
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.statText}>
                  {course.rating?.toFixed(1) || '4.5'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Default variant
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ 
            uri: course.thumbnail || 'https://via.placeholder.com/300x200/667eea/ffffff?text=Course+Thumbnail'
          }}
          style={styles.thumbnail}
        />
        <View style={styles.thumbnailOverlay}>
          <View style={styles.levelBadge}>
            <Ionicons 
              name={getLevelIcon(course.level)} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.levelText}>
              {course.level || 'beginner'}
            </Text>
          </View>
          {course.price === 0 && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {course.category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.duration}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.durationText}>
              {course.duration || 'Self-paced'}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {course.description}
        </Text>

        <View style={styles.instructorRow}>
          <Ionicons name="person-circle-outline" size={16} color="#64748b" />
          <Text style={styles.instructorText} numberOfLines={1}>
            {course.instructor?.name || 'Unknown Instructor'}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>
              {course.rating?.toFixed(1) || '4.5'}
            </Text>
            <Text style={styles.reviewsText}>
              ({course.reviews || 0})
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            {course.price === 0 ? (
              <Text style={styles.freePrice}>Free</Text>
            ) : (
              <Text style={styles.price}>${course.price}</Text>
            )}
          </View>
        </View>

        <View style={styles.enrollmentContainer}>
          <View style={styles.enrollmentProgress}>
            <View 
              style={[
                styles.enrollmentFill,
                { 
                  width: `${Math.min(
                    ((course.enrolledStudents || 0) / 100) * 100, 
                    100
                  )}%` 
                }
              ]} 
            />
          </View>
          <Text style={styles.enrollmentText}>
            {course.enrolledStudents || 0} enrolled
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Default Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  freeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#667eea',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#64748b',
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  instructorText: {
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  reviewsText: {
    fontSize: 12,
    color: '#64748b',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  freePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  enrollmentContainer: {
    marginTop: 8,
  },
  enrollmentProgress: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  enrollmentFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  enrollmentText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
  },

  // Small Card Styles
  smallCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  smallThumbnail: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  smallContent: {
    padding: 12,
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 18,
  },
  smallInstructor: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  smallFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
  },
  smallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  smallRatingText: {
    fontSize: 12,
    color: '#64748b',
  },

  // Featured Card Styles
  featuredCard: {
    width: width - 64,
    height: 240,
    borderRadius: 20,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  featuredThumbnail: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 24,
  },
  featuredDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 18,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredInstructor: {
    flex: 1,
  },
  featuredInstructorText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CourseCard;