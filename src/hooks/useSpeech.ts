"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Thin wrapper around the Web Speech API. Speaks question prompts (NOT
// Quranic text). Returns `supported = false` when the browser lacks
// SpeechSynthesis so the UI can hide the button. Single-utterance: starting
// a new speak() cancels any ongoing one.
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, lang: "en" | "ar" = "en") => {
      // Qur'anic words in prompts are fully vowelled, and device voices misread
      // them, so any word carrying harakat is left out of what is spoken.
      const spoken = text
        .split(/\s+/)
        .filter((word) => !/[\u064B-\u0650\u0652\u0670]/.test(word))
        .join(" ");
      if (!supported || !spoken) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = lang === "ar" ? "ar-SA" : "en-US";
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
