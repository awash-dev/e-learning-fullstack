// app/components/ReviewModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  existingReview?: { rating: number; comment: string } | null;
  courseTitle: string;
}

export default function ReviewModal({
  visible,
  onClose,
  onSubmit,
  existingReview,
  courseTitle,
}: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#1c1d1f" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {existingReview ? 'Edit Review' : 'Write a Review'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {courseTitle}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Star Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={48}
                    color={star <= rating ? '#e59819' : '#d1d7dc'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && '😞 Poor'}
                {rating === 2 && '😐 Fair'}
                {rating === 3 && '🙂 Good'}
                {rating === 4 && '😊 Very Good'}
                {rating === 5 && '🤩 Excellent'}
              </Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <Text style={styles.sectionSubtitle}>
              Share your thoughts about this course
            </Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={8}
              placeholder="What did you like or dislike about this course? What did you learn? Be specific to help other students."
              placeholderTextColor="#9ca3af"
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {comment.length} characters (min. 10)
            </Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color="#a435f0" />
              <Text style={styles.tipsTitle}>Tips for a great review</Text>
            </View>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Be specific about what you learned</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Mention the instructor's teaching style</Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.tipText}>Share how the course helped you</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (rating === 0 || comment.trim().length < 10) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || comment.trim().length < 10 || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {existingReview ? 'Update Review' : 'Submit Review'}
                </Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6a6f73',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6a6f73',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1d1f',
    textAlign: 'center',
    marginTop: 8,
  },
  textArea: {
    backgroundColor: '#f7f9fa',
    borderWidth: 1,
    borderColor: '#d1d7dc',
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: '#1c1d1f',
    minHeight: 150,
    lineHeight: 24,
  },
  characterCount: {
    fontSize: 12,
    color: '#6a6f73',
    marginTop: 8,
    textAlign: 'right',
  },
  tipsCard: {
    backgroundColor: '#f7f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d7dc',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1d1f',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1c1d1f',
    flex: 1,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a435f0',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d7dc',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});