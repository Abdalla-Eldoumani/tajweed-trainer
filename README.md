# Tajweed Trainer

A web app for learning Tajweed — the rules of proper Quran recitation. Built with Next.js, TypeScript, and Tailwind CSS.

All rules follow Hafs 'an 'Asim, the most widely used Qira'ah globally.

## What it does

- **9 learning modules** covering Makharij (articulation points), Noon Sakinah & Tanween, Meem Sakinah, Ghunnah, Qalqalah, Madd (elongation), Laam & Raa, Tafkheem & Tarqeeq, and Waqf (stopping rules)
- **Color-coded Quran text** using the Quran.com Foundation API, matching the standard Tajweed Mushaf color scheme
- **Audio playback** from Al Quran Cloud API with Al-Husary (teaching style) and Alafasy reciters
- **Practice quizzes** that test your ability to identify tajweed rules in real Quranic examples
- **Progress tracking** with lesson completion, quiz scores, and daily streaks stored in localStorage

## Content

All tajweed rules, letter classifications, and Quranic examples come from pre-verified JSON files in `src/data/content/`. Nothing is AI-generated. Every example includes exact surah:ayah references.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Produces a static export in `out/` — no server required. Deploy to any static hosting.

## Tech

- Next.js 14 (App Router, static export)
- TypeScript (strict mode)
- Tailwind CSS
- Quran.com Foundation API v4 (tajweed-colored text, no auth)
- Al Quran Cloud API (audio, no auth)
- localStorage for progress and settings

## Project structure

```
src/
├── app/              # Pages (home, learn, practice, progress, settings)
│   └── learn/        # 9 module pages
├── components/
│   ├── ui/           # Base components (Button, Card, ArabicText, TajweedText, AudioPlayer)
│   ├── layout/       # Sidebar, Header
│   ├── learn/        # Module cards, rule cards, letter grids, makhraj diagram
│   └── practice/     # Quiz session, practice questions, streak counter
├── hooks/            # useAudio, useSettings, useProgress, useLocalStorage
├── lib/              # Types, API wrappers, storage, utilities
├── data/content/     # Pre-verified tajweed JSON files (11 files)
└── styles/           # Global CSS with tajweed color classes
```
