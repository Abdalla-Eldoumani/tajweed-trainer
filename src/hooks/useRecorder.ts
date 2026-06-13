"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "ready" | "denied";

// Pick a mime type the browser can actually record. Chrome and Firefox do webm
// (opus); Safari only does mp4/aac. An empty string lets MediaRecorder choose
// its own default.
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

// Records the user's own voice for self-comparison, in memory only. The audio
// never leaves the device: the recording is held as an object URL that is
// revoked on re-record and on unmount. Nothing is uploaded, persisted, or
// scored. States idle -> recording -> ready, or -> denied when the mic is
// blocked / unavailable.
export function useRecorder() {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<RecorderState>("idle");
  const [url, setUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(
      typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    );
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const record = useCallback(async () => {
    if (!supported || state === "recording") return;
    // Drop any previous take before starting a new one.
    revokeUrl();
    setUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const objectUrl = URL.createObjectURL(blob);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setState("ready");
        stopStream();
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      // Permission denied, no device, or an insecure context.
      stopStream();
      setState("denied");
    }
  }, [supported, state, revokeUrl, stopStream]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  // Discard the current take and return to idle (used by re-record).
  const reset = useCallback(() => {
    stop();
    revokeUrl();
    setUrl(null);
    setState("idle");
  }, [stop, revokeUrl]);

  useEffect(() => {
    return () => {
      const r = recorderRef.current;
      if (r && r.state !== "inactive") r.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return { supported, state, url, record, stop, reset };
}
