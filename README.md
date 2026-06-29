# 🧠 CYBERDECK

> *Your personal cybersecurity flashcard companion — built for retention, designed for focus.*

[![Expo](https://img.shields.io/badge/Expo-54.0.34-000020?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Expo_SQLite-003B57?style=flat-square&logo=sqlite)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Status](https://img.shields.io/badge/Status-Beta-10B981?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-EF4444?style=flat-square)]()

---

## 📖 About

**CYBERDECK** is a personal, offline-first flashcard app built specifically for studying **cybersecurity**. It uses a custom **Spaced Repetition System (SRS)** to help you retain technical concepts, commands, tools, and methodologies — all while keeping your data private and local on your device.

> Built by a cybersecurity learner, for cybersecurity learners. 🛡️

---

## ✨ Features

### 🧠 SRS Engine (Custom SM-2)
- **4 Ratings:** Again / Hard / Good / Easy
- **Dynamic Ease Factor:** Each card has its own ease factor (default 2.5) that adjusts based on your performance
- **Consecutive Failures Tracking:** Auto‑suspends cards after 5 failures in a row — protects your mental energy
- **365‑Day Interval Cap:** No card goes beyond one year (cybersecurity changes fast!)
- **Midnight Cutoff:** Cards become due at 12am, not mid‑day — consistent scheduling

### 🎯 Review & Study
- **Re‑View Mode:** Practice any card without affecting your SRS schedule
- **Deck Filtering:** Focus on specific decks during review sessions
- **Flip Animation:** Smooth, satisfying card flips

### 📊 Home Dashboard
- **Due Now** count with color‑coded status
- **New Cards** waiting to be learned
- **Due by Deck** breakdown
- **🔥 Daily Streak** tracker — stay consistent
- **Wisdom Quote** — daily motivation
- **Latest Win** — celebrate your victories

### ✍️ Card Management
- **Forge Card** (`add.tsx`) — manual card creation with deck selector
- **Browse Vault** (`browse.tsx`) — search, edit, delete, and batch move/delete cards
- **10 Card Types** — Q&A, Definition, ELI5, Abbreviation, Command, Difference, Port, Scenario, What to Check, Interview

### 📝 Mistake & Win Journal
- **Mistake Bank** — log confusing concepts, mark them resolved
- **Win Log** — capture milestones and small victories

### 💾 Backup & Restore
- **Export Full Backup** — save all decks, cards, review logs, mistakes, and wins as JSON
- **Restore Backup** — full disaster recovery
- **Merge Import** — add AI‑generated decks/cards without wiping your current data
- **Copy Import Template** — pre‑filled JSON template for ChatGPT/Claude

### 🔒 Privacy
- **100% offline** — all data stored locally via SQLite
- **No cloud sync** — your data stays on your device

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo (React Native) |
| **Language** | TypeScript |
| **Database** | expo-sqlite |
| **Navigation** | react-native-pager-view |
| **UI/Styling** | React Native StyleSheet, SafeAreaView |
| **File Handling** | expo-document-picker, expo-file-system |
| **Icons** | @expo/vector-icons (Ionicons) |

---

## 📁 Project Structure

```text
cyberdeck-mobile/
├── app/
│   ├── _layout.tsx          # Tab navigation (PagerView)
│   ├── index.tsx            # Home dashboard
│   ├── review.tsx           # Flashcard review screen
│   ├── add.tsx              # Create new cards
│   ├── browse.tsx           # Search, edit, batch manage cards
│   └── more.tsx             # Backup, mistakes, wins
├── src/
│   └── database.ts          # All SQLite logic, SRS engine, migrations
├── assets/                  # Icons, splash screen
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```


---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `decks` | Study decks with name, description, color |
| `cards` | Flashcards with front, back, card_type, tags, notes |
| `review_logs` | History of all SRS and Re‑View reviews |
| `mistakes` | Mistake journal entries |
| `wins` | Win log entries |
| `user_meta` | Streak tracking (last_review_date, current_streak) |
| `app_metadata` | Schema version tracking |
| `session_journal` | Optional session reflection (future use) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Expo CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/MarkKramm/cyberdeck-mobile.git
cd cyberdeck-mobile

# Install dependencies
npm install

# Start the app
npx expo start
git clone https://github.com/MarkKramm/cyberdeck-mobile.git
cd cyberdeck-mobile

# Install dependencies
npm install

# Start the app
npx expo start
