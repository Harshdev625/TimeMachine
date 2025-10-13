# Changelog

All notable changes to TimeMachine will be documented in this file.

## [1.6.1] - 2025-10-13

### Added
- Google OAuth integration for seamless sign-in experience
- "Continue with Google" button in authentication flow
- Enhanced backend Google OAuth endpoint with proper token verification
- Chrome Identity API integration for secure Google authentication

### Improved
- Authentication flow now supports both email/password and Google OAuth
- Token storage and management for Google-authenticated users
- Backend user creation for Google OAuth users with proper defaults
- Error handling and user feedback for Google authentication failures

### Security
- Google ID token validation using official Google Auth library
- Secure token exchange between extension and backend
- Proper OAuth2 client configuration in manifest

## [1.6.0]

### Added
- Optional in-page keyword scanning toggle (privacy control) in Guard tab
- Enhanced blocked page with action buttons (Close Tab, Open Dashboard, Start Focus)
- `PRIVACY.md` with detailed data handling policy
- `homepage_url` in manifest

### Changed
- Pruned legacy modal authentication CSS (lighter bundle)
- Minor copy and documentation adjustments for clarity
- Manifest version bump to 1.6.0
- Reduced bundle size with CSS optimization

## [1.5.1]

### Removed
- All remaining device references (code & docs)
- Modal authentication system completely replaced with inline auth

### Changed
- Summary tab now contains the PDF Download button (moved from Settings)
- Report generator always returns a PDF (even with no activity – shows a note)
- Security docs aligned to bcrypt hashing

## [1.5.0]

### Added
- Focus Sessions: refreshed UI with presets and clear controls
- Guard: website + keyword blocking with Quick Block feature
- In-app confirmation modal for blocking actions
- Modern theme-aware blocked page
- Solver: redesigned session cards and quick start functionality
- Theming: shared design tokens across popup and blocked page

### Changed
- Summary: top 3 sites highlighted with Gold/Silver/Bronze styling and normalized spacing
- Scheduler: "next scheduled" time now shown in Settings
- Performance: popup.js memoized backend URL + event delegation for Guard lists

### Removed
- Localhost permissions from manifest (Chrome Web Store publish preparation)