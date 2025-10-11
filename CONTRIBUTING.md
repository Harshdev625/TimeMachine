# Contributing to TimeMachine

Thanks for your interest in contributing! This project is open-source under the MIT License and welcomes contributions during Hacktoberfest and beyond.

This repo contains two parts:
- Chrome extension (folder: `extension/`)
- Node.js + Express backend (folder: `backend/`)

We aim for small, focused pull requests with clear descriptions and screenshots for UI changes.

## Quicklinks
- Code of Conduct: https://github.com/Harshdev625/TimeMachine/blob/main/CODE_OF_CONDUCT.md
- Security: https://github.com/Harshdev625/TimeMachine/blob/main/SECURITY.md
- Open Issues: https://github.com/HarshDev625/TimeMachine/issues
- Good First Issues: https://github.com/HarshDev625/TimeMachine/labels/good%20first%20issue
- Hacktoberfest Issues: https://github.com/HarshDev625/TimeMachine/labels/hacktoberfest

## Getting Started (Dev Setup)
Prerequisites:
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Google Chrome (for loading the extension)

Backend:
1. `cd backend`
2. `npm install`
3. Create `.env` (copy `.env.example` if present) with:
   - `MONGODB_URI=mongodb://localhost:27017/timemachine`
   - `JWT_SECRET=your-long-secret`
4. `npm run dev` to start the API (nodemon).

Extension (unpacked):
1. Open Chrome → `chrome://extensions` → enable Developer Mode
2. Load Unpacked → select the `extension/` folder
3. Click the extension icon → Sign up / Log in → test your change

## Branching & Commits
- Create branches off `main`: `feat/short-title`, `fix/bug-xyz`
- Prefer Conventional Commits for clarity:
  - feat: add Guard keyword toggle
  - fix: correct timezone day split
  - docs: update README quickstart
  - refactor: simplify popup event wiring
  - chore: bump deps

## Coding Guidelines
- JavaScript only (no framework). Keep changes minimal and focused.
- Avoid broad reformatting. Keep existing style and file layout.
- For UI changes, include screenshots/gifs in the PR.
- For backend changes, describe any schema or API changes and test steps.

## Submitting a Pull Request
1. Fork and create a branch
2. Make changes with clear commit messages
3. Run and manually test:
   - Backend endpoints you touched
   - Extension flows (popup/blocked page) relevant to your change
4. Open a PR against `main` with:
   - Linked issue (e.g., “Closes #123”)
   - Summary of changes + screenshots (when UI changes)
   - Notes on testing and any follow-ups

We use labels like `bug`, `enhancement`, `good first issue`, `hacktoberfest`. Maintainers will review and may request tweaks.

## Hacktoberfest Notes
- The repository will carry the `hacktoberfest` topic during the event.
- Issues intended for contributors will be labeled `hacktoberfest` and/or `good first issue`.
- Valid PRs will be merged, approved in review, or labeled `hacktoberfest-accepted`.
- Spam or low-effort PRs will be labeled `spam` and/or `invalid` and closed.

## License
By contributing, you agree that your contributions will be licensed under the MIT License of this repository.

## Maintainers: Hacktoberfest Checklist
- Add the repository topic `hacktoberfest`.
- Apply the `hacktoberfest` label to issues you want help with; add `good first issue` when suitable.
- Triage PRs promptly: merge valid ones, or leave an approving review, or add the `hacktoberfest-accepted` label.
- Mark spam requests as `spam` and close; mark incorrect ones as `invalid`.

## Contact
Open an issue for discussion, or comment directly on a relevant issue/PR.
