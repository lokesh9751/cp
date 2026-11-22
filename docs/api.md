# Competitive Pirates API Reference

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

**Note:** Guest sessions return `authenticated: false` instead of an error. The frontend should treat this as an unauthenticated state.

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

## Health Check

### GET /api/health

Check database connectivity.

**Authentication:** None required

**Success Response:** `200 OK`
```json
{
  "status": "healthy",
  "database": "connected"
}
```

**Error Response:** `503 Service Unavailable`
```json
{
  "status": "unhealthy",
  "database": "disconnected"
}
```

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
- `RATE_LIMITED` - Too many requests (not yet implemented)
- `INTERNAL_ERROR` - Server error

## CORS Policy

Allowed origins: `http://localhost:3000` (configurable via `FRONTEND_URL`)

Credentials: Always included for credentialed requests