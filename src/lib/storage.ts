import type { TajweedProgress, UserSettings, ModuleProgress } from "./types";

const STORAGE_KEY = "tajweed-trainer-progress";

const DEFAULT_SETTINGS: UserSettings = {
  reciter: "husary",
  playbackSpeed: 1.0,
  fontSize: "normal",
  darkMode: false,
  showTransliteration: true,
  showTranslation: true,
};

const DEFAULT_PROGRESS: TajweedProgress = {
  modules: {},
  settings: DEFAULT_SETTINGS,
  streaks: {
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: "",
  },
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getProgress(): TajweedProgress {
  if (!isBrowser()) return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function setProgress(progress: TajweedProgress): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable
  }
}

export function getSettings(): UserSettings {
  return getProgress().settings;
}

export function setSettings(settings: UserSettings): void {
  const progress = getProgress();
  progress.settings = settings;
  setProgress(progress);
}

export function getModuleProgress(moduleId: string): ModuleProgress {
  const progress = getProgress();
  return progress.modules[moduleId] ?? {
    lessonsCompleted: [],
    quizScores: [],
    lastAccessed: "",
  };
}

export function markLessonComplete(moduleId: string, lessonId: string): void {
  const progress = getProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = {
      lessonsCompleted: [],
      quizScores: [],
      lastAccessed: "",
    };
  }
  if (!progress.modules[moduleId].lessonsCompleted.includes(lessonId)) {
    progress.modules[moduleId].lessonsCompleted.push(lessonId);
  }
  progress.modules[moduleId].lastAccessed = new Date().toISOString();
  setProgress(progress);
}

export function saveQuizScore(moduleId: string, lessonId: string, score: number): void {
  const progress = getProgress();
  if (!progress.modules[moduleId]) {
    progress.modules[moduleId] = {
      lessonsCompleted: [],
      quizScores: [],
      lastAccessed: "",
    };
  }
  progress.modules[moduleId].quizScores.push({
    lessonId,
    score,
    date: new Date().toISOString(),
  });
  progress.modules[moduleId].lastAccessed = new Date().toISOString();
  setProgress(progress);
}

export function resetProgress(): void {
  if (!isBrowser()) return;
  const progress = getProgress();
  // Keep settings, reset everything else
  setProgress({
    ...DEFAULT_PROGRESS,
    settings: progress.settings,
  });
}

export function updateStreak(): void {
  const progress = getProgress();
  const today = new Date().toISOString().split("T")[0];
  const lastDate = progress.streaks.lastPracticeDate;

  if (lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastDate === yesterdayStr) {
    progress.streaks.currentStreak += 1;
  } else {
    progress.streaks.currentStreak = 1;
  }

  if (progress.streaks.currentStreak > progress.streaks.longestStreak) {
    progress.streaks.longestStreak = progress.streaks.currentStreak;
  }

  progress.streaks.lastPracticeDate = today;
  setProgress(progress);
}
