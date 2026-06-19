"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { fetchAudioUrl } from "@/lib/audio-api";

// Owns the single <audio> element for the whole session (the iOS single-element
// rule) and drives it from the global player store. Renders nothing; mounted
// once in AppProvider so playback survives route changes.
export function PlayerHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadSeq = useRef(0);
  // Pending inter-verse gap timer. When interVersePause > 0 the advance to the
  // next queue item waits this long; the id lives here so a pause/stop landing
  // mid-gap (or an unmount) can cancel it and nothing auto-resumes.
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadToken = usePlayer((s) => s.loadToken);
  const seekToken = usePlayer((s) => s.seekToken);
  const status = usePlayer((s) => s.status);
  const speed = usePlayer((s) => s.speed);
  const surahName = usePlayer((s) => s.surahName);
  const index = usePlayer((s) => s.index);

  // Create the one audio element and wire its events. Restore any saved resume.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const get = usePlayer.getState;
    const clearGap = () => {
      if (gapTimer.current !== null) {
        clearTimeout(gapTimer.current);
        gapTimer.current = null;
      }
    };
    audio.ontimeupdate = () => get().onTime(audio.currentTime, audio.duration || 0);
    audio.onloadedmetadata = () => {
      const { pendingOffset } = get();
      if (pendingOffset > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(pendingOffset, audio.duration);
      }
      get().onLoaded(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onended = () => {
      clearGap();
      // The store's onEnded owns the advance decision; the host only decides
      // whether to defer that call by the inter-verse gap (EDGE_CASES B6: a real
      // timer, never silence baked into audio). At gap 0 the advance is immediate
      // and unchanged from before. Looping a single ayah (repeatOne) or sitting
      // at the queue end (stop) gets no gap; only a real move to a next item does.
      const st = get();
      const willAdvance = st.status === "playing" && (st.repeatOne <= 0 || st.repeatsDone + 1 >= st.repeatOne);
      if (st.interVersePause > 0 && willAdvance) {
        gapTimer.current = setTimeout(() => {
          gapTimer.current = null;
          // Re-read at fire time: a pause or stop that landed during the gap
          // wins, exactly as the fetch resolver drops a load the user stopped.
          if (usePlayer.getState().status !== "playing") return;
          usePlayer.getState().onEnded();
        }, st.interVersePause * 1000);
        return;
      }
      st.onEnded();
    };
    // A media error after the src is set (404, decode failure, network drop)
    // means this reciter has no playable audio for the current verse. Pause and
    // surface a clear message so the user can switch reciter; the control never
    // sits silently dead. Ignore spurious errors when no src is loaded.
    audio.onerror = () => {
      if (!audio.currentSrc && !audio.src) return;
      const st = get();
      st.pause();
      st.setError("audio.unavailable");
    };
    get().restore();
    return () => {
      clearGap();
      audio.pause();
      audio.removeAttribute("src");
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, []);

  // Load the current verse whenever loadToken changes; a stale fetch is ignored.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || loadToken === 0) return;
    const seq = ++loadSeq.current;
    const s = usePlayer.getState();
    const cur = s.current();
    if (!cur) return;
    audio.playbackRate = s.speed;
    fetchAudioUrl(cur.surah, cur.ayah, s.reciter)
      .then((url) => {
        if (seq !== loadSeq.current || !audioRef.current) return;
        // stop() does not bump loadToken, so the seq guard alone cannot see a
        // close that landed while the URL was in flight. Re-read the store and
        // drop the load rather than resurrect audio the user already stopped;
        // toggling back from idle issues a fresh loadToken anyway.
        const now = usePlayer.getState();
        if (now.status === "idle" || !now.current()) return;
        audio.src = url;
        audio.load();
        // Derive the intent at resolve time, not before the fetch: a pause (or
        // stop) that landed mid-fetch must win over the stale wish to play.
        if (now.status === "loading" || now.status === "playing") {
          audio
            .play()
            .then(() => {
              if (seq !== loadSeq.current) return;
              if (usePlayer.getState().status === "idle") return;
              usePlayer.setState({ status: "playing" });
            })
            .catch(() => {
              // Autoplay blocked or load failed; wait for a user gesture. A
              // stop that raced the rejection keeps the player hidden.
              if (seq !== loadSeq.current) return;
              if (usePlayer.getState().status === "idle") return;
              usePlayer.setState({ status: "paused" });
            });
        }
        // Warm the next ayah in continuous mode so the gap stays minimal.
        const s2 = usePlayer.getState();
        if (s2.mode === "continuous" && s2.index < s2.queue.length - 1) {
          const nxt = s2.queue[s2.index + 1];
          fetchAudioUrl(nxt.surah, nxt.ayah, s2.reciter).catch(() => {});
        }
      })
      .catch(() => {
        // The fetch failed (no file for this reciter/verse, or a network
        // error). Pause and flag it so the mini-player can prompt a reciter
        // change instead of leaving a dead control. After a stop, stay
        // silent: repainting the bar with an error would undo the close.
        if (seq !== loadSeq.current) return;
        const now = usePlayer.getState();
        if (now.status === "idle" || !now.current()) return;
        usePlayer.setState({ status: "paused" });
        usePlayer.getState().setError("audio.unavailable");
      });
  }, [loadToken]);

  // Play / pause in response to status changes that are not a fresh load.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") {
      if (audio.paused && audio.src) audio.play().catch(() => usePlayer.setState({ status: "paused" }));
    } else if (audio.src && !audio.paused) {
      audio.pause();
    }
  }, [status]);

  // A pause or stop that lands during the inter-verse gap must cancel the pending
  // advance so nothing auto-resumes. Any non-playing status clears the timer; the
  // gap only ever runs while playing, so this never drops a live advance.
  useEffect(() => {
    if (status !== "playing" && gapTimer.current !== null) {
      clearTimeout(gapTimer.current);
      gapTimer.current = null;
    }
  }, [status]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekToken === 0) return;
    const { seekTarget } = usePlayer.getState();
    const target = Math.max(0, seekTarget);
    audio.currentTime = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.min(target, audio.duration) : target;
  }, [seekToken]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Minutes-based sleep timer: stop playback once the wall-clock deadline passes.
  useEffect(() => {
    const id = setInterval(() => {
      const { sleepDeadline } = usePlayer.getState();
      if (sleepDeadline && Date.now() >= sleepDeadline) usePlayer.getState().stop();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Media Session: lock-screen / headset metadata and controls, where supported.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const cur = usePlayer.getState().current();
    if (!cur) return;
    const label = surahName ?? `Surah ${cur.surah}`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${label}, Ayah ${cur.ayah}`,
      artist: "Quran",
      album: label,
    });
    navigator.mediaSession.setActionHandler("play", () => usePlayer.getState().resume());
    navigator.mediaSession.setActionHandler("pause", () => usePlayer.getState().pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => usePlayer.getState().next());
    navigator.mediaSession.setActionHandler("previoustrack", () => usePlayer.getState().prev());
  }, [loadToken, surahName, index]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState =
      status === "playing" ? "playing" : status === "paused" ? "paused" : "none";
  }, [status]);

  // Persist the resume position when the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => usePlayer.getState().persist();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
