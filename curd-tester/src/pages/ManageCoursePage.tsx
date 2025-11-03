// src/pages/ManageCoursePage.jsx
import React, { useState, useEffect } from 'react';
import CourseForm from '../../components/CourseForm/CourseForm';
import { getCourseById, createCourse, updateCourse } from '../../api/courseApi';

const COURSE_ID_FROM_URL = null;

const ManageCoursePage = () => {
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (COURSE_ID_FROM_URL) {
      const fetchCourse = async () => {
        try {
          setIsLoading(true);
          setServerError('');
          const courseData = await getCourseById(COURSE_ID_FROM_URL);
          setInitialData(courseData);
        } catch (error) {
          setServerError(error.message || 'Could not fetch course data.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCourse();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleFormSubmit = async (courseData) => {
    setIsSubmitting(true);
    setServerError('');
    try {
      let savedCourse;
      if (courseData._id) {
        savedCourse = await updateCourse(courseData._id, courseData);
        alert(`Course "${savedCourse.title}" updated successfully!`);
      } else {
        savedCourse = await createCourse(courseData);
        alert(`Course "${savedCourse.title}" created successfully!`);
      }
      console.log('Success:', savedCourse);
    } catch (error) {
      setServerError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <CourseForm
            initialData={initialData}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>
      </div>
    </div>
  );
};

export default ManageCoursePage;