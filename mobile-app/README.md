# YUNAFied Mobile (React Native)

This is the mobile app version of YUNAFied, built with Expo and React Native.

## Features
- Landing and login flow
- Role-based drawer (hamburger menu)
- Dashboard, schedules, assignments, announcements
- Users and performance views for admin/teacher
- Student pages: AI Guide, Translator, Milestones, Gamified Learning, Video Summarizer
- Profile settings

## Setup
1. Install dependencies:
   - `npm install`
2. Configure backend URL:
   - Edit `app.json` -> `expo.extra.apiUrl`
   - For Android emulator, use `http://10.0.2.2:4000`
   - For physical device, use your machine LAN IP like `http://192.168.x.x:4000`
3. Run:
   - `npm run start` (tunnel mode, recommended for Expo Go)
   - or `npm run start:lan` (same Wi-Fi network only)

## Expo Go Troubleshooting
- If QR opens but app fails immediately, avoid localhost URLs.
- Ensure backend is reachable from phone using LAN IP in `app.json`.
- Keep backend running with `npm run dev` in the root project.
- If LAN mode fails due network/firewall, use tunnel mode: `npm run start:tunnel`.

## Notes
- The app connects to the same backend used by the web app.
- Ensure backend is running before signing in.
