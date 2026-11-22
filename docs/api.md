# Competitive Pirates API Reference

> **Note:** This is backend-only Phase 2A. Frontend still uses existing mocks until a later integration phase.

## Authentication

### POST /api/auth/signup

Register a new user account.

**Authentication:** None required

**Request Body:**
```json
{
  "username": "string (3-20 chars, lowercase letters, digits, underscore)",
  "email": "string (valid email, trimmed, lowercase)",
  "password": "string (8-100 chars, max 72 bytes)"
}
```

**Success Response:** `201 Created`
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "ISO date string"
  },
  "accessToken": "string"
}
```

**Error Responses:**
- `409 Conflict` - Username or email already exists
- `400 Bad Request` - Validation error

**Example Error:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Unable to create account",
    "fieldErrors": {
      "username": ["Username is already taken"]
    }
  }
}
```

### POST /api/auth/login

Log in with existing credentials.

**Authentication:** None required

**Request Body:**
```json
{
  "identifier": "string (email or username)",
  "password": "string"
}
```

**Success Response:** `200 OK`
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "ISO date string"
  },
  "accessToken": "string"
}
```

**Set-Cookie:** `refreshToken` (httpOnly, sameSite: lax)

**Error Responses:**
- `401 Unauthorized` - Invalid credentials

### POST /api/auth/refresh

Refresh access token using refresh token cookie.

**Authentication:** Refresh token cookie required

**Success Response:** `200 OK`

**Authenticated Session:**
```json
{
  "authenticated": true,
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "ISO date string"
  },
  "accessToken": "string"
}
```

**Set-Cookie:** New `refreshToken` cookie

**Guest Session (no/invalid refresh token):**
```json
{
  "authenticated": false,
  "user": null,
  "accessToken": null
}
```

**Note:** Guest sessions return `authenticated: false` instead of an error. The frontend should treat this as an unauthenticated state. Public GET routes degrade invalid optional access tokens to guest responses.

### POST /api/auth/logout

Revoke session and clear refresh token cookie.

**Authentication:** Optional (refresh token cookie if present)

**Success Response:** `204 No Content`

**Clear-Cookie:** `refreshToken`

### GET /api/auth/me

Get current authenticated user.

**Authentication:** Bearer access token required

**Success Response:** `200 OK`
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "ISO date string"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token

## Problems API

### GET /api/problems

List problems with filtering and pagination.

**Authentication:** Optional - returns personalized data for authenticated users

**Query Parameters:**
| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| type | string | 'all', 'dsa', 'cp' | 'all' | Filter by problem type |
| search | string | - | - | Case-insensitive title search (trimmed, max 200 chars) |
| difficulty | string | 'all', 'easy', 'medium', 'hard' | 'all' | Filter by difficulty |
| topic | string | - | 'all' | Filter by topic slug |
| page | integer | 1-1000000 | 1 | Page number |
| limit | integer | 1-50 | 10 | Results per page |

**Success Response:** `200 OK`
```json
{
  "problems": [
    {
      "id": 1,
      "slug": "two-sum",
      "title": "Two Sum",
      "type": "DSA",
      "difficulty": "EASY",
      "acceptanceRate": 52.0,
      "topics": [
        { "id": 1, "name": "Arrays", "slug": "arrays" },
        { "id": 2, "name": "Hash Table", "slug": "hash-table" }
      ],
      "isBookmarked": false,
      "userStatus": "UNSOLVED"
    }
  ],
  "topics": [
    { "id": 1, "name": "Arrays", "slug": "arrays" }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 20,
    "totalPages": 2
  }
}
```

**User Status Precedence:**
- `SOLVED`: At least one ACCEPTED submission by the current user
- `ATTEMPTED`: At least one submission AND no ACCEPTED submission
- `UNSLOVED`: No submissions by the current user
- Accepted takes precedence over failed submissions

**Guest Behavior:**
- `isBookmarked`: always `false`
- `userStatus`: always `"UNSOLVED"`
- `status=solved` or `status=attempted` returns empty results

**Pagination Semantics:**
- Deterministic ordering: `createdAt ASC, id ASC`
- `totalPages = Math.ceil(total / limit)`, or `0` if `total = 0`
- Out-of-range page returns empty `problems` array (not an error)

**Topic-Slug Behavior:**
- Filtering uses `Topic.slug`, not display name
- Unknown but valid topic slugs return empty result (not an error)

### POST /api/problems/:slug/bookmark

Toggle bookmark for a problem.

**Authentication:** Required (Bearer access token)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Problem slug (trimmed, 1-200 chars) |

**Request Body:** Empty object `{}`

**Success Response:** `200 OK`
```json
{
  "slug": "two-sum",
  "isBookmarked": true
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Problem does not exist

**Toggle Non-Idempotency:**
- First call: creates bookmark, returns `isBookmarked: true`
- Second call: deletes bookmark, returns `isBookmarked: false`
- Do not blindly replay uncertain requests

**Concurrency:**
- Atomic read-modify-write using transaction
- Handles race conditions with bounded retries

## Contests API

### GET /api/contests

List all ongoing and upcoming contests.

**Authentication:** Optional - returns personalized data for authenticated users

**Success Response:** `200 OK`
```json
{
  "ongoing": [
    {
      "id": 1,
      "slug": "ongoing-dsa-showdown",
      "title": "Ongoing DSA Showdown",
      "type": "DSA",
      "startsAt": "2026-11-22T10:00:00.000Z",
      "endsAt": "2026-11-22T13:00:00.000Z",
      "durationMinutes": 180,
      "isRegistered": false,
      "likesCount": 15,
      "dislikesCount": 2
    }
  ],
  "upcoming": [
    {
      "id": 2,
      "slug": "algorithm-weekly",
      "title": "Algorithm Weekly",
      "type": "DSA",
      "startsAt": "2026-11-26T10:00:00.000Z",
      "endsAt": "2026-11-26T12:00:00.000Z",
      "durationMinutes": 120,
      "isRegistered": false,
      "likesCount": 42,
      "dislikesCount": 5
    }
  ],
  "serverTime": "2026-11-22T12:00:00.000Z"
}
```

**Lifecycle Classification:**
- **Upcoming:** `startsAt > now`
- **Ongoing:** `startsAt <= now AND endsAt > now`
- **Ended:** `endsAt <= now` (excluded from list, but directly retrievable via GET /api/contests/:slug)

**Ordering:** Each array ordered by `startsAt ASC, id ASC`

**Reaction Counts:**
- Count actual `ContestReaction` database rows only
- Do not add frontend initial/mock reaction counts
- Counts reflect real-time database state (may change immediately after response)

### GET /api/contests/:slug

Get a single contest by slug.

**Authentication:** Optional - returns personalized data for authenticated users

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Contest slug (trimmed, 1-200 chars) |

**Success Response:** `200 OK`
```json
{
  "id": 1,
  "slug": "ongoing-dsa-showdown",
  "title": "Ongoing DSA Showdown",
  "type": "DSA",
  "description": "Weekly DSA contest",
  "uploadedAt": "2026-11-20T10:00:00.000Z",
  "startsAt": "2026-11-22T10:00:00.000Z",
  "endsAt": "2026-11-22T13:00:00.000Z",
  "durationMinutes": 180,
  "isRegistered": false,
  "likesCount": 15,
  "dislikesCount": 2,
  "userReaction": null,
  "serverTime": "2026-11-22T12:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Contest does not exist

**Personalized Fields (for authenticated users):**
- `isRegistered`: comes from actual `ContestRegistration` row
- `userReaction`: `LIKE`, `DISLIKE`, or `null`

**Public Fields (for guests):**
- `isRegistered`: `false`
- `userReaction`: `null`

**Excluded Fields:**
- Actual contest problems
- Participant lists
- User email addresses
- Submission code
- Internal relation records

### POST /api/contests/:slug/register

Register for a contest.

**Authentication:** Required (Bearer access token)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Contest slug (trimmed, 1-200 chars) |

**Request Body:** Empty object `{}`

**Success Response:** `200 OK`
```json
{
  "slug": "algorithm-weekly",
  "isRegistered": true
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Contest does not exist
- `400 Bad Request` - Registration closed

**Registration Deadline Rule:**
If `now >= startsAt`, returns `400` with:
```json
{
  "error": {
    "code": "REGISTRATION_CLOSED",
    "message": "Contest has already started. Registration is closed."
  }
}
```

This rule applies even to repeat registration requests after the start time.

**Idempotency:**
- Upserts by `[userId, contestId]` unique constraint
- Preserves original `registeredAt` for already-registered users
- Do not automatically retry the entire HTTP request on race conditions

### POST /api/contests/:slug/reaction

Toggle contest reaction (like/dislike).

**Authentication:** Required (Bearer access token)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| slug | string | Contest slug (trimmed, 1-200 chars) |

**Request Body:**
```json
{
  "reaction": "LIKE" | "DISLIKE"
}
```

**Success Response:** `200 OK`
```json
{
  "slug": "algorithm-weekly",
  "likesCount": 42,
  "dislikesCount": 5,
  "userReaction": null
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Contest does not exist

**Toggle Behavior:**
- Same reaction → deletes reaction, `userReaction: null`
- Opposite reaction → updates to new type
- No existing reaction → creates new

**Concurrency:**
- Atomic transaction for mutation and count reads
- Bounded retries for expected transaction conflicts

**Notes:**
- Reactions allowed on upcoming, ongoing, and ended contests
- No registration requirement beyond authentication
- Count semantics: actual database rows only, may change immediately after response

## Session Design

### Token Lifetimes
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

### Token Storage
- **Access Token:** Browser memory only (never persisted to localStorage/sessionStorage)
- **Refresh Token:** HttpOnly cookie with SameSite=lax

### Security Features
- Access tokens use HS256 signature with separate secrets
- Refresh tokens are hashed (SHA-256) before storage
- Sessions are tracked in database and can be revoked
- Token rotation on refresh prevents replay attacks

### Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `CONFLICT` - Resource already exists
- `INVALID_CREDENTIALS` - Wrong username/email or password
- `UNAUTHORIZED` - Authentication required or token invalid
- `NOT_FOUND` - Resource not found
- `REGISTRATION_CLOSED` - Contest registration deadline passed
- `RATE_LIMITED` - Too many requests (not yet implemented)
- `INTERNAL_ERROR` - Server error

## CORS Policy

Allowed origins: `http://localhost:3000` (configurable via `FRONTEND_URL`)

Credentials: Always included for credentialed requests

## Seed and Schedule Refresh

The seed script creates fixtures based on a reference time captured once per seed run.

**Normal Seed Behavior:**
- Creates missing fixtures
- Upserts safe content without rescheduling existing contests
- Does not delete users, registrations, reactions, bookmarks, or submissions
- Preserves existing fixture content and slugs

**Schedule Refresh (Development Only):**
- Use with explicit environment variable or command flag
- Confirms you are on a development database before refreshing
- Warning: Refreshing dates changes registration eligibility
- Does not delete or fabricate user activity

## Phase 2A Limitations

This is backend-only Phase 2A implementation:
- Frontend still uses existing mocks
- No WebSocket support for real-time updates
- No rate limiting implementation
- No caching layer for API responses