<div align="center">

# TimeMachine

<img src="extension/icon128.png" width="128" height="128" alt="TimeMachine Logo">

### Smart Time Tracking & Productivity Management for Chrome

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

[![Website](https://img.shields.io/badge/Website-Live-blue)](https://harshdev625.github.io/TimeMachine/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen?logo=googlechrome)](https://chromewebstore.google.com/detail/timemachine/hjkicompionnablkpkgnplnacnnchjij)
[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Contributors](https://img.shields.io/github/contributors/Harshdev625/TimeMachine)](https://github.com/Harshdev625/TimeMachine/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2025-orange)](https://hacktoberfest.com/)

[Overview](#📖-overview) • [Features](#✨-features) • [Quick Start](#🚀-quick-start) • [Tech Stack](#🛠️-tech-stack) • [Contributing](#🤝-contributing) • [Contributors](#👥-contributors)

</div>

---

## 📖 Overview

TimeMachine is an open-source Chrome extension with a Node.js backend designed to help you understand and optimize your digital time usage. It automatically tracks website activity, provides insightful analytics, enables focus management, and generates comprehensive reports—all while respecting your privacy.

**Built for developers, students, remote workers, and anyone seeking better digital wellness.**

### 🎯 Key Capabilities

- **Automatic Time Tracking** - Monitors active tab time with minute-level precision
- **Focus Sessions** - Pomodoro-style timers with pause/resume controls
- **Smart Blocking** - Website and keyword filtering to minimize distractions
- **Rich Analytics** - Daily, weekly, and monthly productivity insights
- **PDF & Email Reports** - Comprehensive summaries with charts and statistics
- **Privacy-First** - Only domains and durations stored, no full URLs
- **Customizable Themes** - 7 built-in themes to match your preferences

## 🌐 Landing Page

Visit our official landing page: **[https://harshdev625.github.io/TimeMachine/](https://harshdev625.github.io/TimeMachine/)**

The landing page showcases:
- 📊 Interactive feature demos with screenshots
- 🎨 Visual design and theming examples
- 📱 Live analytics dashboard preview
- 🚀 Quick installation guide
- 💡 Use cases and benefits

**Source:** The landing page is built with HTML5, CSS3, and vanilla JavaScript. Source files are in the `docs/` directory.

## ✨ Features

### Time Tracking & Analytics
- **Automatic Monitoring** - Tracks active tab time in real-time (minute-level granularity)
- **Timezone Support** - Local time tracking for accurate day boundaries
- **Category Classification** - Organize sites into Work, Social, Entertainment, Professional, or Other
- **Multi-View Dashboard** - Daily, weekly, and monthly analytics
- **Quick Insights** - Top sites, focus vs leisure ratio, balance score, category distribution
- **Productivity Scoring** - Algorithmic score based on category weights

### Focus Management
- **Focus Sessions** - Preset timers with full controls (start, pause, resume, stop)
- **Daily Statistics** - Track focus time trends
- **Theme-Aware Interface** - Seamless integration with chosen theme

### Guard & Blocking
- **Website Blocking** - Block distracting domains
- **Keyword Filtering** - Optional in-page keyword scanning
- **Quick Block** - One-click blocking for current site
- **Custom Blocked Page** - Informative page with action buttons (Go Back, Start Focus, Open Dashboard)
- **Privacy Toggle** - Enable/disable keyword scanning as needed

### Reports & Insights
- **PDF Reports** - Comprehensive summaries with:
  - Key insights and productivity metrics
  - Ranked domain table with session statistics
  - Category distribution charts
  - Time-based visualizations
- **Email Integration** - Automated reports via EmailJS (HTML format with charts)
- **Local Scheduling** - Daily, weekly, or monthly report triggers (no external dependencies)

### Additional Features
- **Solver Tracker** - Log problem-solving sessions with categories
- **Offline Support** - Local buffering with automatic retry and sync
- **Authentication** - Simple email/password with 30-day JWT tokens
- **Feedback System** - In-app authenticated feedback submission
- **7 UI Themes** - Light, Dark, Cyberpunk, Minimal, Ocean, Sunset, Forest
- **In-App Guide** - Built-in help documentation

> **📋 Latest Release:** See [CHANGELOG.md](CHANGELOG.md) for version history and recent updates.

## 🛠️ Tech Stack

> **Important for Contributors:** Understanding our tech stack helps you get started quickly!

### Frontend (Extension)
- **Languages:** JavaScript (ES6+), HTML5, CSS3
- **Manifest:** Chrome Extension Manifest V3
- **Charts:** Chart.js (interactive visualizations)
- **Architecture:** Modular design with service workers
- **Styling:** Custom CSS with theme system (7 themes)

### Backend (API Server)
- **Runtime:** Node.js (v14+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens), bcrypt
- **Reports:** PDFKit (PDF generation), quickchart-js (charts)
- **Email:** EmailJS Integration

### Development Tools
- **Version Control:** Git & GitHub
- **Package Manager:** npm
- **Testing:** Manual testing + Chrome DevTools
- **Deployment:** Chrome Web Store (extension), Self-hosted (backend)

### Key Libraries
| Library | Purpose | Version |
|---------|---------|---------|
| `express` | Backend API framework | ^4.18.0 |
| `mongoose` | MongoDB object modeling | ^8.0.0 |
| `jsonwebtoken` | JWT authentication | ^9.0.0 |
| `bcrypt` | Password hashing | ^5.1.0 |
| `pdfkit` | PDF report generation | ^0.15.0 |
| `chart.js` | Frontend charting | ^4.4.0 |
| `quickchart-js` | Server-side chart images | ^3.1.3 |

### Architecture Overview
```
                    ┌─────────────────────────────────────┐
                    │      Chrome Extension (Frontend)     │
                    │                                      │
                    │  ┌──────────────┐  ┌──────────────┐  │
                    │  │   Popup UI   │  │   Content    │  │
                    │  │  (HTML/CSS)  │  │   Scripts    │  │
                    │  └──────┬───────┘  └──────┬───────┘  │
                    │         │                 │          │
                    │  ┌──────┴─────────────────┴───────┐  │
                    │  │   Background Service Worker    │  │
                    │  │   (Time Tracking Logic)        │  │
                    │  └────────────────┬───────────────┘  │
                    └───────────────────┼──────────────────┘
                                        │
                                        │ REST API (HTTPS)
                                        │ JWT Authentication
                                        │
                    ┌───────────────────▼──────────────────┐
                    │      Node.js + Express Backend       │
                    │                                      │
                    │  ┌────────────┐   ┌──────────────┐  │
                    │  │   Routes   │   │   Models     │  │
                    │  │   (API)    │──▶│  (Mongoose)  │  │
                    │  └────────────┘   └──────┬───────┘  │
                    │                          │          │
                    │  ┌────────────┐          │          │
                    │  │   Utils    │          │          │
                    │  │ (Timezone, │          │          │
                    │  │ Validation)│          │          │
                    │  └────────────┘          │          │
                    └─────────────────────────┼───────────┘
                                              │
                                              ▼
                              ┌─────────────────────────┐
                              │   MongoDB Database      │
                              │                         │
                              │  • Users                │
                              │  • TimeData             │
                              │  • FocusSessions        │
                              │  • BlockedSites         │
                              │  • Feedback             │
                              └─────────────────────────┘
```

## 🚀 Quick Start

### 👤 For Users

**Install from Chrome Web Store (Recommended)** 🌟
1. Visit [Chrome Web Store](https://chromewebstore.google.com/detail/timemachine/hjkicompionnablkpkgnplnacnnchjij)
2. Click "Add to Chrome"
3. Click the extension icon and sign up with email/password
4. Start browsing - tracking happens automatically

**Basic Usage** 📱
- View analytics in the **Analytics** tab
- Start focus sessions in the **Focus** tab
- Block distractions in the **Guard** tab
- Generate reports in the **Summary** tab
- Click the **?** button anytime for help

### 👨‍💻 For Developers

**Backend Setup**
```bash
# Clone repository
git clone https://github.com/HarshDev625/TimeMachine.git
cd TimeMachine/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set:
# - MONGODB_URI=mongodb://localhost:27017/timemachine
# - JWT_SECRET=your-secret-key

# Start development server
npm run dev
```

**Extension Setup**
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `extension` folder from the cloned repository
5. The extension icon will appear in your toolbar

## 📁 Project Structure

```
TimeMachine/
 backend/
    index.js              # Express server entry point
    models/
       User.js           # User schema (email, password, settings)
       TimeData.js       # Time tracking data schema
       FocusSession.js   # Focus session records
       BlockedSite.js    # Blocked websites/keywords
       Feedback.js       # User feedback
    routes/
       auth.js           # Authentication endpoints
       timeData.js       # Time tracking API
       focusSessions.js  # Focus management API
       blockedSites.js   # Guard/blocking API
       report.js         # PDF generation
       feedback.js       # Feedback API
    utils/
        validation.js     # Input validation
        timezone.js       # Timezone utilities

 extension/
    manifest.json         # Extension configuration
    background.js         # Service worker (tracking logic)
    popup.html            # Main UI
    popup.js              # UI controller
    auth.js               # Authentication helper
    config.js             # API configuration
    blocked.html          # Blocked page template
    blocked.js            # Blocked page logic
    content-blocker.js    # Content script for keyword blocking
    report-scheduler.js   # Report scheduling logic
    modules/
       api.js            # API client
       analytics-tab.js  # Analytics functionality
       focus-tab.js      # Focus session management
       guard-tab.js      # Blocking controls
       summary-tab.js    # Summary & reports
       solver-tab.js     # Problem solver tracker
       utils.js          # Shared utilities
    css/                  # Stylesheets

 docs/                     # Landing page (GitHub Pages)
    index.html           # Landing page HTML
    assets/              # Images and icons
    css/style.css        # Landing page styles
    js/main.js           # Landing page scripts
```

## 📚 Documentation

### 🔌 API Endpoints

#### 🔐 Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/update-settings` - Update user settings

#### ⏱️ Time Tracking
- `POST /api/time-data/sync` - Sync tracking data (batch)
- `GET /api/time-data/report/:email` - Get time data for date range
- `PATCH /api/time-data/category` - Update domain category

#### 📊 Reports
- `POST /api/report/generate` - Generate PDF report

#### 🎯 Focus Sessions
- `POST /api/focus-sessions` - Create focus session
- `GET /api/focus-sessions/:email` - Get user's focus sessions

#### 🛡️ Guard/Blocking
- `GET /api/blocked-sites/:email` - Get blocked sites list
- `POST /api/blocked-sites` - Add blocked site/keyword
- `DELETE /api/blocked-sites/:id` - Remove blocked item

#### 💬 Feedback
- `POST /api/feedback/submit` - Submit feedback
- `GET /api/feedback/my` - Get user's feedback
- `GET /api/feedback/all` - Get all feedback (admin)
- `PATCH /api/feedback/status/:id` - Update feedback status (admin)

### 🗄️ Data Models

**User**
```javascript
{
  email: String,
  password: String (bcrypt hashed),
  role: String (default: 'user'),
  settings: {
    receiveReports: Boolean,
    reportFrequency: String,
    categories: Map
  },
  timezone: {
    name: String,
    offset: Number
  },
  lastActive: Date
}
```

**TimeData** (unique per user/date/domain)
```javascript
{
  userEmail: String,
  date: String (YYYY-MM-DD),
  domain: String,
  totalTime: Number (milliseconds),
  sessions: [{
    startTime: Date,
    endTime: Date,
    duration: Number
  }],
  category: String,
  timezone: String
}
```

### ⚙️ Tracking Logic

The extension uses a sophisticated event-driven tracking system:

1. **Session Management**
   - Tab activation or URL change closes previous session
   - New session starts for active domain
   - Sessions are buffered locally before sync

2. **Sync Strategy**
   - Incremental flush every 1 minute
   - Bulk sync every 5 minutes
   - Stale session cutoff at 15 minutes
   - Offline support with retry mechanism

3. **Time Calculation**
   - Minute-level granularity
   - Local timezone tracking (fixes UTC drift issues)
   - Idle detection with automatic session termination
   - Lock screen handling

### 📧 Email Reports

Configure automated email reports using EmailJS:

1. Create account at [EmailJS](https://www.emailjs.com/)
2. Set up email template with variables:
   - `to_email` - Recipient address
   - `subject` - Email subject
   - `message` - HTML content with charts
   - `message_text` - Plain text fallback
3. In extension Settings, enter:
   - Service ID
   - Template ID
   - Public Key
4. Test with "Send Test Email" button
5. Enable scheduling (daily/weekly/monthly)

**Template Tip:** Use triple braces `{{{message}}}` to render HTML without escaping.

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help make TimeMachine better:

### 🚀 Quick Start
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### 📋 Guidelines
- Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- Check existing issues before creating new ones
- Include screenshots for UI changes
- Test your changes locally

### 🎯 Ways to Contribute
- 🐛 **Bug fixes** - Help us squash bugs
- ✨ **New features** - Add cool functionality
- 📚 **Documentation** - Improve guides and docs
- 🎨 **UI/UX** - Make it more beautiful and user-friendly
- 🧪 **Testing** - Help us maintain quality

### 🎃 Hacktoberfest
We're participating in Hacktoberfest 2025! Look for issues labeled `hacktoberfest` and join the fun.

## 🔒 Security

Security is a top priority. Current measures:

- **Password Security**: bcrypt hashing with per-hash salt
- **Authentication**: JWT tokens with 30-day expiry
- **CORS**: Restricted to extension origins + localhost (dev)
- **Authorization**: All endpoints require valid JWT
- **Privacy**: No full URLs stored, only domains and durations

**Found a security issue?** Please open a private issue with minimal details and request secure contact. See [SECURITY.md](SECURITY.md) for details.

## 🔐 Privacy

TimeMachine respects your privacy:

- **Minimal Data Collection**: Only domains and time durations
- **No URL Tracking**: Full URLs are never stored
- **Local First**: Data buffered locally before sync
- **Optional Features**: Keyword scanning can be disabled
- **User Control**: Delete data anytime
- **No Third-Party Tracking**: No analytics or ads

Read our complete [Privacy Policy](PRIVACY.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- **Documentation**: This README + in-app guide
- **Issues**: [GitHub Issues](https://github.com/HarshDev625/TimeMachine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/HarshDev625/TimeMachine/discussions)
- **Website**: [https://harshdev625.github.io/TimeMachine/](https://harshdev625.github.io/TimeMachine/)

## 🙏 Acknowledgments

- **Chart.js** - Beautiful charts and visualizations
- **QuickChart** - Server-side chart generation for reports
- **PDFKit** - PDF generation
- **EmailJS** - Email integration
- **All Contributors** - Thank you for your contributions!

## 👥 Contributors

<a href="https://github.com/Harshdev625/TimeMachine/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Harshdev625/TimeMachine" alt="Contributors" />
</a>

---

<div align="center">

**Built with ❤️ by the open-source community**

[Report Bug](https://github.com/HarshDev625/TimeMachine/issues) • [Request Feature](https://github.com/HarshDev625/TimeMachine/issues) • [Star this repo ⭐](https://github.com/HarshDev625/TimeMachine)

</div>
