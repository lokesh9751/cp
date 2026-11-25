function normalizeApiBaseUrl(rawUrl) {
  const fallback = 'http://localhost:4000';
  let val = String(rawUrl || '').trim();
  if (!val) return fallback;

  // Fix accidental malformed scheme like "https:/example.com" -> "https://example.com"
  val = val.replace(/^(https?):\/([^/])/i, '$1://$2');

  if (!/^https?:\/\//i.test(val)) {
    val = `https://${val}`;
  }

  return val.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export function resolveAssetUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = String(endpoint || '').startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
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

export async function uploadProfileAvatar(file, accessToken, crop = null) {
  const formData = new FormData();
  formData.append('avatar', file);
  if (crop) {
    formData.append('crop', JSON.stringify(crop));
  }

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

export async function adminCreateContestProblem(payload, accessToken) {
  const { data } = await apiRequest('/api/admin/contests/problems', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.problem;
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

export async function getGlobalLeaderboard(params = {}, accessToken = null, options = {}) {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.league && params.league !== 'ALL') sp.set('league', params.league);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.page) sp.set('page', String(params.page));
  if (params.limit) sp.set('limit', String(params.limit));

  const qs = sp.toString() ? `?${sp.toString()}` : '';
  const { data } = await apiRequest(`/api/leaderboard${qs}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}

export async function getMyAnalytics(accessToken, options = {}) {
  const { data } = await apiRequest('/api/profile/analytics', {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}

export async function getPublicProfile(username, options = {}) {
  const { data } = await apiRequest(
    `/api/profile/u/${encodeURIComponent(username)}`,
    {
      method: 'GET',
      signal: options.signal,
    }
  );
  return data;
}


// --- Social (Friends & Chat) APIs ---

export async function getSocialOverview(accessToken, options = {}) {
  const { data } = await apiRequest('/api/social/overview', {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data;
}

export async function searchSocialUsers(query, accessToken, options = {}) {
  const { data } = await apiRequest(
    `/api/social/search?q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: authHeaders(accessToken),
      signal: options.signal,
    }
  );
  return data.users || [];
}

export async function sendFriendRequestApi(userId, accessToken) {
  const { data } = await apiRequest('/api/social/requests', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ userId }),
  });
  return data;
}

export async function respondFriendRequestApi(friendshipId, action, accessToken) {
  const { data } = await apiRequest(`/api/social/requests/${friendshipId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ action }),
  });
  return data;
}

export async function removeFriendApi(friendId, accessToken) {
  const { data } = await apiRequest(`/api/social/friends/${friendId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function getChatMessages(friendId, accessToken, options = {}) {
  const { data } = await apiRequest(`/api/social/messages/${friendId}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
    signal: options.signal,
  });
  return data.messages || [];
}

export async function sendChatMessageApi(friendId, content, accessToken) {
  const { data } = await apiRequest(`/api/social/messages/${friendId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content }),
  });
  return data.message;
}

export async function editChatMessageApi(messageId, content, accessToken) {
  const { data } = await apiRequest(`/api/social/messages/${messageId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content }),
  });
  return data.message;
}

export async function deleteChatMessageApi(messageId, accessToken) {
  const { data } = await apiRequest(`/api/social/messages/${messageId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data.message;
}

// --- Moderation & Rating APIs ---

export async function adminFinalizeContestRatings(contestId, accessToken) {
  const { data } = await apiRequest(`/api/moderation/contests/${contestId}/finalize`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function adminDisqualifyParticipant(contestId, userId, reason, accessToken) {
  const { data } = await apiRequest(`/api/moderation/contests/${contestId}/disqualify`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ userId, reason }),
  });
  return data;
}

export async function adminRemoveContestRating(contestId, userId, accessToken) {
  const { data } = await apiRequest(
    `/api/moderation/contests/${contestId}/ratings/${userId}`,
    {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    }
  );
  return data;
}

export async function superuserUpdateBan(userId, payload, accessToken) {
  // payload: { action: 'PERMANENT' | 'TEMP' | 'UNBAN', durationHours?, reason? }
  const { data } = await apiRequest(`/api/moderation/users/${userId}/ban`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function superuserDeleteUser(userId, accessToken) {
  const { data } = await apiRequest(`/api/moderation/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function superuserToggleStealth(isProfileHidden, accessToken) {
  const { data } = await apiRequest('/api/moderation/me/stealth', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ isProfileHidden }),
  });
  return data.user;
}

export async function googleAuthApi(credential) {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Google sign-in failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function changeEmailApi({ newEmail, currentPassword }, accessToken) {
  const res = await fetch(`${API_BASE_URL}/api/auth/email`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ newEmail, currentPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Could not update email');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function changePasswordApi({ currentPassword, newPassword }, accessToken) {
  const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Could not update password');
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function deleteAccountApi({ confirmText }, accessToken) {
  const res = await fetch(`${API_BASE_URL}/api/auth/account`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ confirmText }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data?.error?.message || 'Could not delete account');
    err.status = res.status;
    throw err;
  }
  return true;
}