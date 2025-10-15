<div align="center">

⏳ TimeMachine
<img src="https://www.google.com/search?q=https://raw.githubusercontent.com/Harshdev625/TimeMachine/main/extension/icon128.png" width="128" height="128" alt="TimeMachine Logo">

Smart Time Tracking & Productivity Management for Chrome
Overview • Features • Installation • For Developers • License

</div>

📖 Overview
TimeMachine is an open-source Chrome extension that helps you understand and optimize your digital habits. It automatically tracks website activity, provides insightful analytics, enables focus management with a Pomodoro-style timer, and generates comprehensive reports—all while fiercely protecting your privacy.

<div align="center">

A preview of the analytics dashboard.

</div>

🎯 Why TimeMachine?
Privacy First: We never store full URLs, only domains and time spent. Your browsing data is yours alone.

Fully Open-Source: Complete transparency. Fork it, inspect it, contribute to it.

Powerful Analytics: Go beyond simple time tracking with productivity scores and category-based insights.

Free & No Ads: Built for the community, without trackers or third-party ads.

✨ Features
<details>
<summary><strong>Click to see the full list of features</strong></summary>

📊 Time Tracking & Analytics
Automatic Monitoring: Tracks active tab time in real-time with minute-level granularity.

Timezone Support: Ensures accurate tracking across different time zones.

Category Classification: Organize sites into Work, Social, Entertainment, Professional, or Other.

Multi-View Dashboard: View analytics by day, week, or month.

Quick Insights: See top sites, focus vs. leisure ratio, balance score, and category distribution at a glance.

Productivity Scoring: An intelligent algorithm scores your productivity based on site categories.

🧘 Focus Management
Focus Sessions: Use preset Pomodoro timers with full controls (start, pause, resume, stop).

Daily Statistics: Track your focus time trends and build better habits.

Theme-Aware Interface: The UI seamlessly integrates with your chosen theme.

🛡️ Guard & Blocking
Website Blocking: Block distracting domains to stay on task.

Keyword Filtering: Optionally scan and block pages based on keywords.

Quick Block: Block your current site with a single click.

Custom Blocked Page: A friendly, informative page when you land on a blocked site.

Privacy Toggle: Easily enable or disable keyword scanning as needed.

📜 Reports & Insights
PDF Reports: Generate comprehensive summaries with key metrics, domain rankings, and charts.

Email Integration: Receive automated reports via EmailJS, complete with charts.

Local Scheduling: Schedule daily, weekly, or monthly reports without external dependencies.

🚀 Additional Features
Solver Tracker: Log problem-solving sessions for platforms like LeetCode or HackerRank.

Offline Support: Data is buffered locally and syncs automatically when you're back online.

Authentication: Simple, secure email/password login with 30-day JWT tokens.

Feedback System: Submit feedback directly from within the extension.

7 UI Themes: Personalize your experience with Light, Dark, Cyberpunk, and more.

In-App Guide: Built-in help to get you started.

📋 Latest Release: See CHANGELOG.md for version history and recent updates.

</details>

🚀 Installation & Usage
For Users
The easiest way to get started is to install TimeMachine from the Chrome Web Store.

Click the button above and "Add to Chrome".

Click the extension icon in your toolbar and sign up.

That's it! Tracking begins automatically.

For Developers
If you want to contribute or run the project locally, please see the Developer Quick Start guide below.

👨‍💻 For Developers & Contributors
We're thrilled you want to contribute! Here’s everything you need to get started.

<details>
<summary><strong>Click to expand Tech Stack & Architecture details</strong></summary>

🛠️ Tech Stack
Frontend (Extension)
Languages: JavaScript (ES6+), HTML5, CSS3

Manifest: Chrome Extension Manifest V3

Charts: Chart.js

Architecture: Modular design with service workers

Backend (API Server)
Runtime: Node.js (v14+)

Framework: Express.js

Database: MongoDB with Mongoose ODM

Authentication: JWT (JSON Web Tokens), bcrypt

Reports: PDFKit, quickchart-js

Key Libraries
Library

Purpose

Version

express

Backend API framework

^4.18.0

mongoose

MongoDB object modeling

^8.0.0

jsonwebtoken

JWT authentication

^9.0.0

bcrypt

Password hashing

^5.1.0

pdfkit

PDF report generation

^0.15.0

chart.js

Frontend charting

^4.4.0

quickchart-js

Server-side chart images

^3.1.3

🏗️ Architecture Overview
          Chrome Extension (Frontend)
                  │
     ┌────────────┴────────────┐
┌────▼────┐ ┌─────────┐ ┌──────▼──────┐
│ Popup UI│ │ Content │ │ Background  │
│(HTML/CSS) │ Scripts │ │Service Worker│
└─────────┘ └─────────┘ └──────┬──────┘
                               │ REST API (HTTPS, JWT)
                               ▼
                   Node.js + Express Backend
                  │
     ┌────────────┴────────────┐
┌────▼────┐ ┌─────────┐ ┌──────▼──────┐
│  Routes │ │  Models │ │    Utils    │
│  (API)  │ │(Mongoose)│ │(Validation) │
└─────────┘ └────┬────┘ └─────────────┘
                 │
                 ▼
          MongoDB Database
(Users, TimeData, FocusSessions, etc.)

</details>

⚡ Developer Quick Start
1. Backend Setup

# Clone the repository
git clone [https://github.com/Harshdev625/TimeMachine.git](https://github.com/Harshdev625/TimeMachine.git)
cd TimeMachine/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and set MONGODB_URI and JWT_SECRET

# Start the development server
npm run dev

2. Extension Setup

Open Chrome and navigate to chrome://extensions.

Enable "Developer mode" (top right toggle).

Click "Load unpacked".

Select the TimeMachine/extension folder from the cloned repository.

<details>
<summary><strong>Click to see Project Structure & Documentation</strong></summary>

📁 Project Structure
TimeMachine/
├── backend/            # Node.js API server
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API endpoints
│   └── index.js        # Server entry point
├── extension/          # Chrome extension source
│   ├── modules/        # Feature-specific JS modules
│   ├── css/            # Stylesheets and themes
│   ├── background.js   # Service worker (tracking logic)
│   ├── manifest.json   # Extension configuration
│   └── popup.html      # Main UI
└── docs/               # Landing page source (GitHub Pages)

📚 Documentation
🔌 API Endpoints
Auth: POST /signup, POST /login, GET /profile

Time Tracking: POST /sync, GET /report, PATCH /category

Reports: POST /generate

Focus Sessions: POST /, GET /

Guard/Blocking: GET /, POST /, DELETE /:id

Feedback: POST /submit, GET /my

🗄️ Data Models
User: Stores email, hashed password, settings, and timezone.

TimeData: Stores domain, total time, and sessions for a user on a specific date.

</details>

🤝 Contributing
Contributions are welcome! Please read CONTRIBUTING.md for detailed guidelines and follow our Code of Conduct.

👥 Contributors
A huge thanks to all the amazing people who have contributed to TimeMachine!

<a href="https://github.com/Harshdev625/TimeMachine/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Harshdev625/TimeMachine&max=500&columns=20" alt="Contributors" />
</a>

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

<div align="center">

Built with ❤️ by the open-source community

Report a Bug • Request a Feature • Star this Repo ⭐

</div>
