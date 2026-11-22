// API helper for frontend authentication
// Handles requests to the backend Express API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Make an API request with proper error handling
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<{data: any, status: number}>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Include credentials for auth endpoints that use cookies
  if (endpoint.startsWith('/api/auth')) {
    config.credentials = 'include';
  }

  const response = await fetch(url, config);

  // Read response body once
  let data = {};
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      // JSON parse failed
    }
  } else {
    try {
      data = await response.json();
    } catch (e) {
      // Not JSON
    }
  }

  if (!response.ok) {
    // Use safe error message from backend
    const errorMessage = (data?.error?.message) ||
      (typeof data?.error === 'string' ? data.error : 'Request failed');

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;

    // Include fieldErrors if present
    if (data?.error?.fieldErrors) {
      error.fieldErrors = data.error.fieldErrors;
    }

    throw error;
  }

  return { data, status: response.status };
}

/**
 * Register a new user
 * @param {string} username - Username
 * @param {string} email - Email
 * @param {string} password - Password
 * @returns {Promise<{user: object, accessToken: string}>}
 */
export async function signup({ username, email, password }) {
  const { data } = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  return data;
}

/**
 * Login a user
 * @param {string} identifier - Email or username
 * @param {string} password - Password
 * @returns {Promise<{user: object, accessToken: string}>}
 */
export async function login({ identifier, password }) {
  const { data } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  return data;
}

/**
 * Refresh the access token
 * @returns {Promise<{accessToken: string, authenticated: boolean, user: object|null}>}
 */
export async function refreshAccessToken() {
  const { data } = await apiRequest('/api/auth/refresh', {
    method: 'POST',
  });
  return data;
}

/**
 * Logout the current user
 * @returns {Promise<void>}
 */
export async function logout() {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Get the current authenticated user
 * @param {string} accessToken - Access token
 * @returns {Promise<{user: object}>}
 */
export async function getCurrentUser(accessToken) {
  const { data } = await apiRequest('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data;
}

/**
 * Health check endpoint
 * @returns {Promise<{status: string, database: string}>}
 */
export async function healthCheck() {
  const { data } = await apiRequest('/api/health', {
    method: 'GET',
  });
  return data;
}