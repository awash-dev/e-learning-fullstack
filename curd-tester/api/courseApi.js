// src/api/courseApi.js

// --- CONFIGURATION ---
const BASE_URL = 'https://e-learning-back-14h5.vercel.app/api'; // Your backend's base URL
const DEV_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFhNzRhMDllLTQ4MDAtNGRiOS1iZDgzLTIzMzE5N2UwYjFlYyIsInJvbGUiOiJpbnN0cnVjdG9yIiwiaWF0IjoxNzYxOTA4NTM4LCJleHAiOjE3NjQ1MDA1Mzh9.a8-ekpTLD8AvidNYWoOA3StpGb7MkjL3M1UE65_itqg';

console.log('Development token is configured for all API requests.');

/**
 * A custom fetch wrapper that acts like an Axios instance with an interceptor.
 * It automatically handles the base URL, authentication headers, JSON stringification,
 * and error handling for non-2xx responses.
 *
 * @param {string} endpoint - The API endpoint to call (e.g., '/courses').
 * @param {object} [options={}] - The options for the fetch call (method, body, etc.).
 * @returns {Promise<any>} The JSON response from the server.
 */
const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Prepare headers, including the hardcoded auth token
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (DEV_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${DEV_AUTH_TOKEN}`;
  }

  // Configure the request
  const config = {
    ...options,
    headers,
  };

  // Stringify the body if it's a POST/PUT/PATCH request
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  // Make the API call
  const response = await fetch(url, config);

  // Manually handle HTTP errors, as fetch doesn't throw them by default
  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      // Try to get a more specific error message from the server's response body
      const errorData = await response.json();
      errorMessage = errorData.message || JSON.stringify(errorData);
    } catch (e) {
      // If the error response isn't JSON, use the default status text
      errorMessage = response.statusText || errorMessage;
    }
    // Throw an error to be caught by the calling function
    throw new Error(errorMessage);
  }

  // If the response is successful, parse and return the JSON body.
  // Handle cases where a successful response might have no body (e.g., 204 No Content).
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  // For 204 No Content or non-JSON responses, return successfully with no data.
  return; 
};


// --- COURSE API FUNCTIONS (Now automatically authenticated using apiFetch) ---

/**
 * Fetches a single course by its ID.
 */
export const getCourseById = async (courseId) => {
  try {
    return await apiFetch(`/courses/${courseId}`); // No options needed for GET
  } catch (error) {
    console.error('Error fetching course:', error.message);
    throw error; // Re-throw the error to be handled by the component
  }
};

/**
 * Creates a new course.
 */
export const createCourse = async (courseData) => {
  try {
    return await apiFetch('/courses', {
      method: 'POST',
      body: courseData,
    });
  } catch (error) {
    console.error('Error creating course:', error.message);
    throw error;
  }
};

/**
 * Updates an existing course.
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    return await apiFetch(`/courses/${courseId}`, {
      method: 'PUT',
      body: courseData,
    });
  } catch (error) {
    console.error('Error updating course:', error.message);
    throw error;
  }
};