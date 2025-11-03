// src/components/CourseForm/LessonManager.jsx
import React from 'react';
import styles from './CourseForm.module.css';

const LessonManager = ({ lessons, onChange }) => {
  const handleAddLesson = () => {
    const newLesson = { title: '', description: '', youtubeUrl: '', isFree: false };
    onChange([...lessons, newLesson]);
  };

  const handleRemoveLesson = (index) => {
    const updatedLessons = lessons.filter((_, i) => i !== index);
    onChange(updatedLessons);
  };

  const handleLessonChange = (index, field, value) => {
    const updatedLessons = lessons.map((lesson, i) => 
      i === index ? { ...lesson, [field]: value } : lesson
    );
    onChange(updatedLessons);
  };

  return (
    <div className={styles.lessonManager}>
      {lessons.map((lesson, index) => (
        <div key={index} className={styles.lessonCard}>
          <div className={styles.lessonHeader}>
            <h4 className={styles.lessonTitle}>Lesson {index + 1}</h4>
            <button type="button" className={styles.buttonDanger} onClick={() => handleRemoveLesson(index)}>Remove</button>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Lesson Title</label>
            <input type="text" className={styles.input} value={lesson.title} onChange={(e) => handleLessonChange(index, 'title', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={lesson.description} onChange={(e) => handleLessonChange(index, 'description', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>YouTube URL (Optional)</label>
            <input type="text" className={styles.input} value={lesson.youtubeUrl} onChange={(e) => handleLessonChange(index, 'youtubeUrl', e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className={styles.buttonSecondary} onClick={handleAddLesson}>+ Add Lesson</button>
    </div>
  );
};

export default LessonManager;