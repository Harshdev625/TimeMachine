# TimeMachine Backend

Backend API for the TimeMachine browser extension. Provides authentication, time tracking sync, focus/problem session storage, guard (blocked sites & keywords), feedback, and robust PDF report generation.

All legacy per-device logic has been fully removed (no device IDs or device validation). Authentication is now a simple inline email/password flow from the extension popup.

## Features

- Email / password auth (JWT 30d)
- Time tracking sync with deduplication & merged-session total computation
- Timezone-aware daily boundaries (user offset & optional IANA name)
- Focus session tracking + problem solving session tracking
- Guard: blocked sites + blocked keywords
- PDF daily report (domains, categories, focus/problem summaries, guard list, charts) – always returns a PDF even for days with no activity (graceful "No activity" page)
- Feedback submission + admin management
- Zero device tracking; stateless tokens only

## Tech Stack
Express 5 · MongoDB/Mongoose 8 · JWT · bcrypt · pdfkit · quickchart-js · node-cron · moment-timezone (validation only)

## Data Models (Simplified)

### User (`models/User.js`)
```jsonc
{
  email: "string",           // unique, normalized
  password: "<hashed>",      // bcrypt (rounds from env)
  role: "user" | "admin",
  lastActive: "Date",
  settings: {
    receiveReports: true,
    reportFrequency: "daily|weekly|monthly",
    categories: { "domain": "Category" } // stored as Map internally
  },
  timezone: { name: "UTC"|IANA, offset: -720..840, lastUpdated: Date },
  createdAt: Date,
  lastUpdated: Date
}
```

### TimeData (`models/TimeData.js`)
Per user + domain + local day (userLocalDate).
```jsonc
{
  userEmail: "string",
  userLocalDate: "YYYY-MM-DD",   // derived using user offset
  domain: "example.com",
  category: "Work|Social|Entertainment|Professional|Other",
  totalTime: 123456,              // ms (capped 24h) from merged intervals
  sessions: [
    { startTime, endTime, duration, userLocalStartTime, userLocalEndTime }
  ],
  timezone: { name, offset },
  updatedAt, createdAt
}
```

### FocusSession / ProblemSession / BlockedSite / BlockedKeyword / Feedback
See respective model files; each is straightforward (no device references).

## Authentication

Path prefix: `/api/auth`

| Method | Endpoint          | Description |
|--------|-------------------|-------------|
| POST   | `/signup`         | Create user, returns JWT |
| POST   | `/login`          | Login, returns JWT |
| POST   | `/verify`         | Validate token (auth required) |
| GET    | `/profile`        | User profile (auth) |
| POST   | `/reset-password-request` | Issue reset token |
| POST   | `/reset-password` | Consume reset token |
| POST   | `/update-settings`| Update reporting/categories |
| GET    | `/stats` (admin)  | Basic user stats |

Headers for protected routes:
```
Authorization: Bearer <token>
```

## Time Data API
Path prefix: `/api/time-data` (all require auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/sync` | Upsert sessions for (user, domain, local day); deduplicates exact pairs |
| GET  | `/report/:userEmail` | Range fetch (date & endDate, optional user timezone application) |
| GET  | `/refresh/:userEmail` | Current day snapshot or provided date |
| PATCH| `/category` | Update a domain category for a date |
| POST | `/check-activity` | Query if day has any tracked time |
| POST | `/update-timezone` | Update user timezone (offset + name) |
| POST | `/check-new-day` | Determine day rollover & trigger reset logic |
| GET  | `/debug/recent/:userEmail` | Last 10 domain docs (dev/debug) |

Key Validation Rules:
- Date format: `YYYY-MM-DD`
- Domain regex ensures no protocol & valid TLD
- Sessions require numeric start/end/duration (duration must equal end-start)
- Duration per session capped at 12h; daily total capped at 24h

## Report API
Path prefix: `/api/report` (auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate` | Generate PDF daily report (returns PDF stream, includes empty-day minimal PDF). Admins may supply `targetEmail` to generate for another user. |

Body (user self-report):
```json
{ "date": "2025-09-09" }
```

Body (admin cross-user optional fields):
```json
{ "date": "2025-09-09", "targetEmail": "other@user.com" }
```

Response: `application/pdf` (attachment). If no tracked time exists a minimal PDF with a "No activity recorded" note is returned (never a 404).

## Focus / Problem Sessions
Path prefixes (all auth):
- `/api/focus-sessions`
- `/api/problem-sessions`

CRUD-style endpoints (create, list by user, delete, stats) — consult route files for exact shapes. Sessions link to user via `userId` (focus) or `userEmail` (problem solving). Duration stored in minutes (focus) or ms (problem sessions).

## Guard (Blocked Content)
Path prefixes (auth):
- `/api/blocked-sites`
- `/api/blocked-keywords`

Support create/list/delete for site domains & keywords.

## Feedback
Path prefix: `/api/feedback` (auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/submit` | Submit feedback (message only) |
| GET  | `/all` (admin) | List all feedback |
| GET  | `/my` | List current user feedback |
| PATCH| `/status/:id` (admin) | Update feedback status (received|reviewed|resolved) |

## System
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Basic health JSON |
| GET | `/status` (auth + admin) | Runtime stats |

## Environment & Config
Environment variables:
```
MONGODB_URI=mongodb://localhost:27017/timemachine
JWT_SECRET=change-me-please-32chars-min
BCRYPT_ROUNDS=10
PORT=3000
NODE_ENV=development
```

`BCRYPT_ROUNDS` must be a number; signup/login will throw if unset.

## Running Locally
```bash
cd backend
npm install
cp .env.example .env   # create and edit, if you maintain template
npm run dev
```

Check:
```
curl http://localhost:3000/health
```

## Security Notes
- Stateless JWT auth (30d) – no device tracking
- Passwords hashed with bcrypt (`BCRYPT_ROUNDS` configurable)
- CORS restricted to extension + localhost origins
- Admin endpoints guarded by role check

## Timezone Handling
The extension supplies `timezone` (offset minutes) and optionally `timezoneName` (IANA). Daily aggregation uses userLocalDate so server UTC boundaries do not split sessions incorrectly.

## Error Responses (Patterns)
| Code | Meaning |
|------|---------|
| 400 | Validation error / bad input |
| 401 | Missing/invalid token |
| 403 | Role / ownership forbidden |
| 404 | Resource not found |
| 409 | Conflict (email exists) |
| 500 | Internal error |

## Housekeeping Jobs
`node-cron` jobs in `index.js`:
- Midnight per-timezone processing (updates lastActive etc.)
- Optional keep-alive ping (Render free tier) if `HEALTH_URL` or `RENDER_EXTERNAL_URL` set

## Conventions
- All dates in requests: `YYYY-MM-DD`
- All times stored as ms timestamps (sessions) or seconds aggregated in reports
- Categories restricted set; unknown defaults to `Other`

## Removed / Deprecated
- Any `devices` array, `deviceId`, or migration scripts (fully purged)

## Troubleshooting Quick List
| Symptom | Check |
|---------|-------|
| 500 on /sync | Validate domain regex & session shape |
| 400 timezone | Offset must be int -720..840 |
| Login fails | Ensure BCRYPT_ROUNDS & JWT_SECRET set |
| Empty report shows only header | No data for that day – this is expected minimal PDF behavior |

## License
Internal project component of TimeMachine.

## API Endpoints

### Authentication Endpoints

#### POST `/auth/signup`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt-token-here",
  "email": "user@example.com"
}
```

#### POST `/auth/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "email": "user@example.com"
}
```

#### POST `/auth/verify`
Verify JWT token validity (requires Authorization header).

**Headers:**
```
Authorization: Bearer jwt-token-here
```

**Response:**
```json
{
  "valid": true,
  "user": { "id": "...", "email": "user@example.com", "role": "user" }
}
```

#### GET `/auth/profile`
Get user profile information (requires authentication).

### Time Data Endpoints

#### POST `/timeData/sync`
Sync time tracking data (requires authentication).

**Request Body:**
```json
{
  "date": "2024-01-15",
  "sessions": [
    {
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T10:30:00Z",
      "category": "Work",
      "isProductive": true
    }
  ],
  "totalTime": 5400,
  "productiveTime": 5400
}
```

#### GET `/timeData/get?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
Retrieve time data for date range (requires authentication).

### Feedback Endpoints

#### POST `/feedback/submit`
Submit user feedback (requires authentication).

**Request Body:**
```json
{
  "subject": "Feature Request",
  "message": "Would love to see weekly reports feature"
}
```

#### GET `/feedback/list`
List all feedback submissions (requires authentication).

### System Endpoints

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

#### GET `/status`
Detailed system status.

**Response:**
```json
{
  "status": "OK",
  "database": "Connected",
  "uptime": "2h 15m 30s",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

## Security Features

### Password Security
- **bcrypt Hashing**: Passwords hashed with configurable rounds (`BCRYPT_ROUNDS`)
- **No Plain Text Storage**: Passwords are never stored in plain text

### JWT Authentication
- **30-Day Expiration**: Tokens expire after 30 days
- **Bearer Token**: Standard Authorization header format
- **Stateless Sessions**: No per-device tracking logic

### CORS Configuration
- **Chrome Extension Support**: Configured to work with Chrome extensions
- **Dynamic Origin Checking**: Supports various Chrome extension protocols
- **Secure Headers**: Proper CORS headers for security

## Chrome Extension Integration

The backend is specifically configured to work seamlessly with Chrome extensions:

### Token Storage
- Extension stores JWT in both `localStorage` and `chrome.storage.local`
- Automatic synchronization on first retrieval

### CORS Configuration
Supports Chrome extension origins:
- `chrome-extension://`
- `moz-extension://`
- Development localhost origins

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation Steps

1. **Clone and Navigate**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with:
   ```env
   MONGODB_URI=mongodb://localhost:27017/timemachine
   JWT_SECRET=your-super-secure-jwt-secret-key
   PORT=3000
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. ### Run with Docker

```bash
docker compose up --build
```

### Verification

After starting the server, verify it's working:

1. **Health Check**: Visit `http://localhost:3000/health`
2. **Status Check**: Visit `http://localhost:3000/status`

## Error Handling

The backend provides comprehensive error handling:

### Authentication Errors
- **401 Unauthorized**: Invalid or missing token
- **409 Conflict**: Email already exists during signup
- **404 Not Found**: User not found during login

### Validation Errors
- **400 Bad Request**: Missing or invalid fields

### Server Errors
- **500 Internal Server Error**: Database or server issues
- **503 Service Unavailable**: MongoDB connection issues

## Development

### File Structure
```
backend/
├── index.js              # Main server configuration
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (create this)
├── models/
│   ├── User.js           # User model (auth/timezone)
│   ├── TimeData.js       # Time tracking data model
│   ├── Feedback.js       # Feedback collection model
│   ├── FocusSession.js   # Focus session model
│   ├── ProblemSession.js # Problem session model
│   ├── BlockedSite.js    # Site blocking model
│   └── BlockedKeyword.js # Keyword blocking model
└── routes/
  ├── auth.js           # Authentication endpoints
  ├── timeData.js       # Time data endpoints
  ├── feedback.js       # Feedback endpoints
  ├── report.js         # PDF report generation
  ├── focusSessions.js  # Focus sessions endpoints
  ├── problemSessions.js# Problem sessions endpoints
  ├── blockedSites.js   # Site blocking endpoints
  └── blockedKeywords.js# Keyword blocking endpoints
```

### Available Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run setup`: Install dependencies and show setup instructions

## Production Considerations

### Environment Variables
Ensure these are set in production:
- `MONGODB_URI`: Production MongoDB connection string
- `JWT_SECRET`: Strong, unique secret key
- `PORT`: Server port (default: 3000)

### Security Recommendations
1. Use HTTPS in production
2. Set strong JWT secret (minimum 32 characters)
3. Configure MongoDB with authentication
4. Use environment variables for sensitive data
5. Enable MongoDB connection encryption

### Performance Optimization
- Enable MongoDB indexing on frequently queried fields
- Consider connection pooling for high traffic
- Implement rate limiting for production use
- Add request logging and monitoring

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB service is running
   - Verify MONGODB_URI in .env file
   - Ensure MongoDB port (27017) is accessible

2. **JWT Token Issues**
   - Verify JWT_SECRET is set in .env
   - Check token expiration (30 days)
   - Ensure proper Authorization header format

3. **CORS Errors**
  - Ensure extension origin or localhost is allowed in `index.js`

### Logs and Debugging
The server logs important events:
- MongoDB connection status
- Server startup confirmation
- Authentication attempts
- Error details for troubleshooting

## Contributing

When making changes to the backend:

1. **Maintain Security**: Always hash passwords, validate inputs
2. **Error Handling**: Provide meaningful error messages
3. **Documentation**: Update API documentation for new endpoints
4. **Testing**: Test authentication flow and data sync
5. **Chrome Extension Compatibility**: Ensure CORS settings remain compatible

## License

This project is part of the TimeMachine time tracking application.
