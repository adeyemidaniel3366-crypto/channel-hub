# ChannelHub 🌐

**ChannelHub** is a modern, responsive directory platform for discovering and sharing WhatsApp Channels, Telegram Groups, Discord Servers, and more. It features a sleek glassmorphism design, real-time engagement tools, and a powerful cloud-connected admin dashboard.

![Status](https://img.shields.io/badge/Status-Active-success)
![Tech](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Firebase-orange)

## ✨ Features

### User Experience
*   **Broad Platform Support**: WhatsApp, Telegram, Discord, Signal, Slack, LinkedIn, Snapchat.
*   **Smart Discovery**: "You Might Also Like" recommendations and Trending section.
*   **Engagement**:
    *   **Likes**: Real-time global like counters.
    *   **Comments**: Anonymous commenting system with unique "Device ID" tracking.
    *   **Collections**: Create and share personal lists of channels.
*   **Visuals**:
    *   **Auto-Logo**: Automatically fetches favicons or generates gradient initials if no logo exists.
    *   **Dark Mode**: Default sleek dark theme with glass effects.
    *   **Responsive**: Fully optimized for Mobile and Desktop (PWA-ready layout).

### Admin Power Tools (`manage_x9z.html`)
*   **Cloud Sync**: All data stored in **Firebase Realtime Database** (accessible from anywhere).
*   **Dashboard**:
    *   **Overview**: Charts and statistics.
    *   **Submissions**: Approve/Reject user submissions with **Custom Logo Override**.
    *   **Verification**: Review proof for "Verified" badges.
    *   **Reports**: Handle user reports for safety.
    *   **Mass Actions**: Bulk approve/reject pending items.
*   **Safety**: Blacklist system for auto-rejecting spam.
*   **Global Banner**: specific "breaking news" or maintenance alerts.

---

## 🚀 Setup & Installation

### 1. Prerequisites
You need a basic web server (or just open `index.html` locally) and a free **Google Firebase** account.

### 2. Configuration (Crucial!)
This app relies on Firebase for its database.
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Register a **Web App** (`</>`) to get your `firebaseConfig`.
4.  Copy the keys and paste them into `firebase-config.js`:
    ```javascript
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "...",
        databaseURL: "https://YOUR-PROJECT.firebaseio.com",
        projectId: "...",
        // ...
    };
    ```
5.  **Enable Database Rules**: Go to Firebase Console > Realtime Database > Rules and set `.read` and `.write` to `true`.

### 3. Running
Simply open `index.html` in your browser.

---

## 🛡️ Admin Access

*   **URL**: `/manage_x9z.html` (Hidden for security)
*   **Default Password**: `admin123` (Change this in `admin.js` for production!)

## 📁 Project Structure

*   `index.html` - Main user interface.
*   `manage_x9z.html` - Admin Dashboard.
*   `script.js` - Core logic (UI, data fetching, interactions).
*   `admin.js` - Admin logic (charts, approval flows).
*   `style.css` - Global styling and variables.
*   `data.js` - Static constants (initial seed data).
*   `firebase-config.js` - Database connection keys.

## 🤝 Contributing

Feel free to submit Pull Requests or open Issues for new feature ideas like "User Accounts" or "Live Chat"!

---
*Built with ❤️ for Communities*
