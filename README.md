<div align="center">

<img src="extension/icon128.png" width="128" height="128" alt="TimeMachine Logo">

Smart Time Tracking & Productivity Management for Chrome
<!-- Tech Stack Badges -->

<!-- Meta & Social Badges -->

<p>
<a href="https://harshdev625.github.io/TimeMachine/"><img src="https://img.shields.io/badge/Website-Live-blue" alt="Website"></a>
<a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.6.0-blue.svg" alt="Version"></a>
<a href="https://www.google.com/search?q=LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
<a href="https://github.com/Harshdev625/TimeMachine/graphs/contributors"><img src="https://img.shields.io/github/contributors/Harshdev625/TimeMachine" alt="Contributors"></a>
<a href="https://www.google.com/search?q=CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
<a href="https://hacktoberfest.com/"><img src="https://img.shields.io/badge/Hacktoberfest-2025-orange" alt="Hacktoberfest"></a>
</p>

Overview • Features • Getting Started • Contributing • License

</div>

📖 Overview
TimeMachine is an open-source Chrome extension that helps you understand and optimize your digital habits. It automatically tracks website activity, provides insightful analytics, enables focus management with a Pomodoro-style timer, and generates comprehensive reports—all while fiercely protecting your privacy.

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

🚀 Getting Started
This guide will help you get TimeMachine up and running, whether you're a user or a developer.

For Users
The easiest way to get started is to install TimeMachine directly from the Chrome Web Store.

➡️ Install from the Chrome Web Store

Click the link above and "Add to Chrome".

Click the extension icon in your toolbar and sign up.

That's it! Tracking begins automatically.

For Developers & Contributors
Want to run the project locally or contribute changes? Follow these steps.

1. Clone the Repository

# Clone the repository to your local machine
git clone [https://github.com/Harshdev625/TimeMachine.git](https://github.com/Harshdev625/TimeMachine.git)
cd TimeMachine

2. Backend Setup (API Server)

# Navigate to the backend directory
cd backend

# Install all necessary dependencies
npm install

# Create your environment file from the example
cp .env.example .env

Configure Your .env File:
Open the .env file and add your secret keys.

# .env

# MONGODB_URI: Your MongoDB connection string.
# For a local database, this is usually all you need.
MONGODB_URI=mongodb://localhost:27017/timemachine

# JWT_SECRET: A long, random, and secret string for signing authentication tokens.
# Use a password generator or run this command in your terminal: openssl rand -hex 32
JWT_SECRET=your-super-secret-key-that-is-very-long-and-random

Start the Backend Server:

# This will start the server on localhost, typically port 3000
npm run dev

3. Frontend Setup (Chrome Extension)

Open Google Chrome and navigate to chrome://extensions.

Enable "Developer mode" using the toggle in the top-right corner.

Click the "Load unpacked" button.

Select the TimeMachine/extension folder from where you cloned the repository.

The TimeMachine icon should now appear in your browser's toolbar!

🤝 Contributing
We welcome contributions of all kinds! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is appreciated.

Contribution Workflow
Here’s the typical workflow for contributing to TimeMachine:

<pre><code>

Fork the Repo 🍴
│
└─> 2. Clone your fork locally 💻
│
└─> 3. Create a new branch (e.g., feature/new-theme) 🌿
│
└─> 4. Make your changes (Code, test, repeat) 👨‍💻
│
└─> 5. Commit your changes with a clear message 📝
│
└─> 6. Push your branch to your fork on GitHub 🚀
│
└─> 7. Open a Pull Request (PR) to the main repo 📫
│
└─> 8. Get feedback, discuss, and merge! 🎉
</code></pre>

High-Level Data Flow
Understanding how data moves through the system is key to contributing effectively.

<pre><code>
┌───────────────────────────┐      ┌──────────────────────────┐      ┌────────────────────┐
│ Chrome Extension          │      │ Node.js Backend (API)    │      │ MongoDB Database   │
│ (background.js)           │      │                          │      │                    │
├───────────────────────────┤      ├──────────────────────────┤      ├────────────────────┤
│ 1. Track active tab time  ├───────► 2. Receive data via      ├───────► 3. Store/Update   │
│    & user activity        │      │    REST API (/api/sync)    │      │    TimeData, Users,│
│                           │      │                          │      │    etc.            │
│ 4. Periodically sync data │◄─────── 5. Send back confirmation │      │                    │
│    (every 5 mins)         │      │    (200 OK)              │      └────────────────────┘
└───────────────────────────┘      └──────────────────────────┘
</code></pre>

How You Can Contribute
🐛 Bug Fixes: Check the Issues tab for any open bugs. If you find a new one, please report it!

✨ New Features: Have an idea for a new feature? Open an issue to discuss it first.

🎨 UI/UX Improvements: Help make the extension more beautiful and user-friendly.

📚 Documentation: Improve this README, add guides, or clarify instructions.

Please read our full CONTRIBUTING.md for more detailed guidelines.

<details>
<summary><strong>Click for more technical details (Tech Stack, Architecture, etc.)</strong></summary>

🛠️ Tech Stack
Frontend (Extension)
Languages: JavaScript (ES6+), HTML5, CSS3

Manifest: Chrome Extension Manifest V3

Charts: Chart.js

Backend (API Server)
Runtime: Node.js (v14+)

Framework: Express.js

Database: MongoDB with Mongoose ODM

Authentication: JWT (JSON Web Tokens), bcrypt

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
│   └── manifest.json   # Extension configuration
└── docs/               # Landing page source (GitHub Pages)

</details>

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
