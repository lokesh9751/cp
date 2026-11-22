export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function resolveAssetUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const { headers: customHeaders = {}, ...restOptions } = options;

  const isFormData =
    typeof FormData !== 'undefined' && restOptions.body instanceof FormData;

  const headers = { ...customHeaders };
  if (restOptions.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (
    headers.Authorization === 'Bearer null' ||
    headers.Authorization === 'Bearer undefined'
  ) {
    delete headers.Authorization;
  }

  const config = {
    ...restOptions,
    headers,
    credentials: 'include',
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    if (networkErr?.name === 'AbortError') {
      throw networkErr;
    }
    const err = new Error('Unable to reach the server. Please check your connection.');
    err.status = 0;
    err.isNetworkError = true;
    throw err;
  }

  let data = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errorMessage =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      data?.message ||
      'Request failed';

    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = data?.error?.code || null;
    error.data = data;

    if (data?.error?.fieldErrors) {
      error.fieldErrors = data.error.fieldErrors;
    }

    throw error;
  }

  return { data, status: response.status };
}

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

// --- Auth APIs ---

export async function signup({ username, email, password }) {
  const { data } = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  return data;
}

export async function login({ identifier, password }) {
  const { data } = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  return data;
}

export async function refreshAccessToken() {
  const { data } = await apiRequest('/api/auth/refresh', {
    method: 'POST',
  });
  return data;
}

export async function logout() {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(accessToken) {
  const { data } = await apiRequest('/api/auth/me', {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function healthCheck() {
  const { data } = await apiRequest('/api/health', {
    method: 'GET',
  });
  return data;
}

// --- Problems & Bookmarks APIs ---

export async function getProblems(params = {}, accessToken = null, options = {}) {
  const query = new URLSearchParams();

  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
  if (params.topic && params.topic !== 'all') query.set('topic', params.topic);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page && Number(params.page) > 0) query.set('page', String(params.page));
  if (params.limit && Number(params.limit) > 0) query.set('limit', String(params.limit));

  const qs = query.toString();
  const endpoint = qs ? `/api/problems?${qs}` : '/api/problems';

  const { data } = await apiRequest(endpoint, {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}

export async function toggleProblemBookmark(slug, accessToken) {
  const { data } = await apiRequest(
    `/api/problems/${encodeURIComponent(slug)}/bookmark`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  );
  return data;
}

// --- Contests APIs ---

export async function getContests(accessToken = null, options = {}) {
  const { data } = await apiRequest('/api/contests', {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}

export async function getContestBySlug(slug, accessToken = null, options = {}) {
  const { data } = await apiRequest(
    `/api/contests/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
      signal: options.signal,
    }
  );
  return data?.contest || data;
}

export async function registerForContest(slug, accessToken) {
  const { data } = await apiRequest(
    `/api/contests/${encodeURIComponent(slug)}/register`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  );
  return data;
}

export async function reactToContest(slug, reaction, accessToken) {
  const { data } = await apiRequest(
    `/api/contests/${encodeURIComponent(slug)}/reaction`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ reaction }),
    }
  );
  return data;
}

// --- Profile & Locations APIs ---

export async function getProfile(accessToken, options = {}) {
  const { data } = await apiRequest('/api/profile', {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data.profile;
}

export async function updateProfile(payload, accessToken) {
  const { data } = await apiRequest('/api/profile', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.profile;
}

export async function uploadProfileAvatar(file, accessToken) {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await apiRequest('/api/profile/avatar', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: formData,
  });
  return data;
}

export async function deleteProfileAvatar(accessToken) {
  const { data } = await apiRequest('/api/profile/avatar', {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function getCountries(options = {}) {
  const { data } = await apiRequest('/api/locations/countries', {
    method: 'GET',
    signal: options.signal,
  });
  return data.countries || [];
}

export async function getStatesByCountry(countryCode, options = {}) {
  if (!countryCode) return [];
  const { data } = await apiRequest(
    `/api/locations/states/${encodeURIComponent(countryCode)}`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
  return data.states || [];
}