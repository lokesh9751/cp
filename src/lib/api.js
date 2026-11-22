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

export async function getProblems(paramsOrToken = {}, maybeTokenOrOptions = {}, maybeOptions = {}) {
  let params = {};
  let accessToken = null;
  let options = {};

  if (typeof paramsOrToken === 'string') {
    accessToken = paramsOrToken;
    params = typeof maybeTokenOrOptions === 'object' && maybeTokenOrOptions !== null ? maybeTokenOrOptions : {};
    options = maybeOptions || {};
  } else {
    params = typeof paramsOrToken === 'object' && paramsOrToken !== null ? paramsOrToken : {};
    if (typeof maybeTokenOrOptions === 'string') {
      accessToken = maybeTokenOrOptions;
      options = maybeOptions || {};
    } else {
      options = maybeTokenOrOptions || {};
    }
  }

  const sp = new URLSearchParams();
  const cleanSearch = typeof params.search === 'string' ? params.search.trim() : '';
  if (cleanSearch) sp.set('search', cleanSearch);
  if (params.difficulty) sp.set('difficulty', String(params.difficulty));
  if (params.type) sp.set('type', String(params.type));
  if (params.topic) sp.set('topic', String(params.topic));
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));

  const qs = sp.toString() ? `?${sp.toString()}` : '';
  const { data } = await apiRequest(`/api/problems${qs}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}
  
export async function getProblemBySlug(slug, accessToken = null, options = {}) {
  const { data } = await apiRequest(
    `/api/problems/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
      signal: options.signal,
    }
  );
  return data?.problem || data;
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

// --- Submission APIs ---

export async function runCode({ slug, language, code, customInput }, accessToken) {
  const { data } = await apiRequest('/api/submissions/run', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ slug, language, code, customInput }),
  });
  return data;
}

export async function submitCode({ slug, language, code, contestId }, accessToken) {
  const { data } = await apiRequest('/api/submissions', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ slug, language, code, contestId }),
  });
  return data;
}

export async function getSubmissionsByProblem(slug, accessToken, options = {}) {
  const { data } = await apiRequest(
    `/api/submissions/problem/${encodeURIComponent(slug)}`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
      signal: options.signal,
    }
  );
  return data?.submissions || [];
}

export async function getSubmissionById(id, accessToken) {
  const { data } = await apiRequest(
    `/api/submissions/${id}`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
    }
  );
  return data?.submission || data;
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

// --- Admin Problems APIs ---

export async function adminListProblems(accessToken, options = {}) {
  const { data } = await apiRequest('/api/admin/problems', {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data.problems || [];
}

export async function adminGetProblem(id, accessToken) {
  const { data } = await apiRequest(`/api/admin/problems/${id}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return data.problem;
}

export async function adminCreateProblem(payload, accessToken) {
  const { data } = await apiRequest('/api/admin/problems', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.problem;
}

export async function adminUpdateProblem(id, payload, accessToken) {
  const { data } = await apiRequest(`/api/admin/problems/${id}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.problem;
}

export async function adminDeleteProblem(id, accessToken) {
  const { data } = await apiRequest(`/api/admin/problems/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function adminGenerateOutput(payload, accessToken) {
  const { data } = await apiRequest('/api/admin/problems/generate-output', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data;
}

// --- Superuser APIs ---

export async function superuserListUsers(search = '', accessToken) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data } = await apiRequest(`/api/admin/superuser/users${qs}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return data.users || [];
}

export async function superuserUpdateUserRole(userId, role, accessToken) {
  const { data } = await apiRequest(`/api/admin/superuser/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ role }),
  });
  return data.user;
}

// --- Admin Contests APIs ---

export async function adminListContests(accessToken) {
  const { data } = await apiRequest('/api/admin/contests', {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return data.contests || [];
}

export async function adminGetContest(id, accessToken) {
  const { data } = await apiRequest(`/api/admin/contests/${id}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return data.contest;
}

export async function adminCreateContest(payload, accessToken) {
  const { data } = await apiRequest('/api/admin/contests', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.contest;
}

export async function adminUpdateContest(id, payload, accessToken) {
  const { data } = await apiRequest(`/api/admin/contests/${id}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.contest;
}

export async function adminDeleteContest(id, accessToken) {
  const { data } = await apiRequest(`/api/admin/contests/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data;
}

// --- Contest Leaderboard API ---

export async function getContestLeaderboard(slug, options = {}) {
  const { data } = await apiRequest(`/api/contests/${encodeURIComponent(slug)}/leaderboard`, {
    method: 'GET',
    signal: options.signal,
  });
  return data;
}