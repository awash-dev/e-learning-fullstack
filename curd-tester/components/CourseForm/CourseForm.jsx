// src/components/CourseForm/CourseForm.jsx
import React, { useState, useEffect } from 'react';
import LessonManager from './LessonManager';

const CATEGORIES = ["Programming", "Design", "Business", "Marketing", "Photography", "Music", "Health & Fitness", "Language", "Other"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const STATUSES = ["draft", "published", "archived"];

const DEFAULT_COURSE_STATE = {
  title: '',
  description: '',
  category: 'Programming',
  level: 'beginner',
  price: 0,
  originalPrice: 0,
  discount: 0,
  language: 'English',
  duration: '',
  requirements: [''],
  whatYouWillLearn: [''],
  targetAudience: [''],
  status: 'draft',
  featured: false,
  tags: [''],
  certificate: {
    enabled: false,
    title: '',
  },
  lessons: [],
};

const CourseForm = ({ initialData, onSubmit, isSubmitting, serverError }) => {
  const [course, setCourse] = useState(DEFAULT_COURSE_STATE);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  useEffect(() => {
    if (initialData) {
      setCourse({
        ...DEFAULT_COURSE_STATE,
        ...initialData,
        certificate: initialData.certificate || DEFAULT_COURSE_STATE.certificate,
        whatYouWillLearn: initialData.whatYouWillLearn?.length ? initialData.whatYouWillLearn : [''],
        requirements: initialData.requirements?.length ? initialData.requirements : [''],
        targetAudience: initialData.targetAudience?.length ? initialData.targetAudience : [''],
        tags: initialData.tags?.length ? initialData.tags : [''],
        lessons: initialData.lessons || [],
      });
      if (initialData.thumbnail) {
        setThumbnailPreview(initialData.thumbnail);
      }
    } else {
      setCourse(DEFAULT_COURSE_STATE);
      setThumbnailFile(null);
      setThumbnailPreview('');
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('certificate.')) {
        const field = name.split('.')[1];
        setCourse(prev => ({
            ...prev,
            certificate: { ...prev.certificate, [field]: type === 'checkbox' ? checked : value }
        }));
        return;
    }

    setCourse(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleArrayChange = (field, index, value) => {
    const updatedArray = [...course[field]];
    updatedArray[index] = value;
    setCourse(prev => ({ ...prev, [field]: updatedArray }));
  };

  const addArrayItem = (field) => {
    setCourse(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const removeArrayItem = (field, index) => {
    if (course[field].length <= 1) {
        handleArrayChange(field, index, '');
        return;
    }
    const updatedArray = course[field].filter((_, i) => i !== index);
    setCourse(prev => ({ ...prev, [field]: updatedArray }));
  };
  
  const handleLessonsChange = (updatedLessons) => {
    setCourse(prev => ({ ...prev, lessons: updatedLessons }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCourseData = {
      ...course,
      whatYouWillLearn: course.whatYouWillLearn.filter(item => item.trim() !== ''),
      requirements: course.requirements.filter(item => item.trim() !== ''),
      targetAudience: course.targetAudience.filter(item => item.trim() !== ''),
      tags: course.tags.filter(item => item.trim() !== ''),
    };
    onSubmit(finalCourseData, thumbnailFile);
  };

  return (
    <div className="relative">
      {isSubmitting && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Submitting...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{serverError}</p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {initialData ? 'Edit Course' : 'Create New Course'}
          </h2>
        </div>

        {/* Core Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Core Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              name="title"
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={course.title}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
              value={course.description}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            {thumbnailPreview && (
              <img src={thumbnailPreview} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.category}
                onChange={handleChange}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                name="level"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.level}
                onChange={handleChange}
              >
                {LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.price}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price ($)</label>
              <input
                name="originalPrice"
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.originalPrice}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
              <input
                name="discount"
                type="number"
                min="0"
                max="100"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.discount}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Curriculum Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Curriculum Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What Students Will Learn</label>
            {course.whatYouWillLearn.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={item}
                  onChange={(e) => handleArrayChange('whatYouWillLearn', index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('whatYouWillLearn', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('whatYouWillLearn')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              + Add Item
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            {course.requirements.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={item}
                  onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('requirements', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('requirements')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              + Add Item
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            {course.targetAudience.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={item}
                  onChange={(e) => handleArrayChange('targetAudience', index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('targetAudience', index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('targetAudience')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Lessons */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Lessons</h3>
          <LessonManager lessons={course.lessons} onChange={handleLessonsChange} />
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.status}
                onChange={handleChange}
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input
                name="language"
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.language}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input
                name="duration"
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.duration}
                onChange={handleChange}
                placeholder="e.g., 10.5 hours"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                name="tags"
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.tags.join(', ')}
                onChange={e => setCourse(prev => ({...prev, tags: e.target.value.split(',').map(tag => tag.trim())}))}
                placeholder="e.g., javascript, web development"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="featured"
                name="featured"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={course.featured}
                onChange={handleChange}
              />
              <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                Feature this course
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="cert-enabled"
                name="certificate.enabled"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={course.certificate.enabled}
                onChange={handleChange}
              />
              <label htmlFor="cert-enabled" className="ml-2 text-sm text-gray-700">
                Enable certificate
              </label>
            </div>
          </div>

          {course.certificate.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Title</label>
              <input
                name="certificate.title"
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={course.certificate.title}
                onChange={handleChange}
                placeholder="e.g., Certificate of Completion"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Course' : 'Create Course')}
        </button>
      </form>
    </div>
  );
};

export default CourseForm;