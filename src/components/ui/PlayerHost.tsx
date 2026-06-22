"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { fetchAudioUrl } from "@/lib/audio-api";
import { subVerseLoopDecision } from "@/lib/follow-along";

// Owns the single <audio> element for the whole session (the iOS single-element
// rule) and drives it from the global player store. Renders nothing; mounted
// once in AppProvider so playback survives route changes.
export function PlayerHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadSeq = useRef(0);
  // Pending inter-verse gap timer. When interVersePause > 0 the advance to the
  // next queue item waits this long; the id lives here so a pause/stop landing
  // mid-gap (or an unmount) can cancel it and nothing auto-resumes. The sub-verse
  // loop reuses this same timer for the gap between its passes.
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True from the moment a sub-verse loop pass reaches its end (the seek-back is
  // initiated, possibly after a gap) until currentTime falls back below endMs.
  // ontimeupdate fires many times a second, so without this latch the same
  // reached-end tick would fire the seek-back / stop repeatedly before the seek
  // takes effect, double-counting passes.
  const subVerseSeeking = useRef(false);

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
    audio.ontimeupdate = () => {
      get().onTime(audio.currentTime, audio.duration || 0);
      // Sub-verse word-range loop: the audio element only fires onended at file
      // end, so the stop-at-target-time mid-verse seam lives HERE. The pure
      // subVerseLoopDecision (no second engine, no timer of its own) decides loop
      // vs stop from the media time; media seconds are rate-independent, so this
      // stays aligned at 0.5x/0.75x/1x with no scaling.
      const st = get();
      const loop = st.subVerseLoop;
      if (!loop || st.status !== "playing") return;
      // Latch: ignore the flood of reached-end ticks until the seek-back lands and
      // currentTime drops below endMs, so a pass is counted exactly once.
      if (subVerseSeeking.current) {
        if (audio.currentTime * 1000 < loop.endMs) subVerseSeeking.current = false;
        return;
      }
      const decision = subVerseLoopDecision(
        { ...loop, done: st.subVerseLoopsDone },
        audio.currentTime * 1000,
      );
      if (decision.kind === "playing") return;
      if (decision.kind === "loop") {
        // A pass ended with more to go: count it now, then seek back to the start
        // after the existing inter-verse gap (pausing the audio across the gap so
        // it does not keep playing past the range), or immediately at gap 0. Reuse
        // the SAME gapTimer + re-read-at-fire-time guard as the onended advance.
        subVerseSeeking.current = true;
        get().noteSubVerseLoopPass();
        const seekBack = () => get().seek(decision.seekMs / 1000);
        if (st.interVersePause > 0) {
          audio.pause();
          gapTimer.current = setTimeout(() => {
            gapTimer.current = null;
            // A pause/stop that landed during the gap wins, exactly as the onended
            // resolver drops an advance the user interrupted.
            const now = usePlayer.getState();
            if (now.status !== "playing" || !now.subVerseLoop) return;
            seekBack();
            if (audio.paused) audio.play().catch(() => usePlayer.setState({ status: "paused" }));
          }, st.interVersePause * 1000);
        } else {
          seekBack();
        }
        return;
      }
      // stop: the last pass finished — clear the loop and pause at the range end,
      // the same calm end the ayah repeatRange exhaustion produces.
      subVerseSeeking.current = false;
      clearGap();
      get().clearSubVerseLoop();
      get().pause();
    };
    audio.onloadedmetadata = () => {
      const { pendingOffset } = get();
      if (pendingOffset > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(pendingOffset, audio.duration);
      }
      get().onLoaded(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onended = () => {
      clearGap();
      // A sub-verse loop whose range ends at (or past) the file's true end can hit
      // onended before ontimeupdate crosses endMs. Treat that as the loop's calm
      // end: clear it and stop here, never running the queue advance with a stale
      // word range armed. (The common case ends earlier, in ontimeupdate above.)
      if (get().subVerseLoop) {
        subVerseSeeking.current = false;
        get().clearSubVerseLoop();
        get().pause();
        return;
      }
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
    // No auto-restore on mount: a saved resume position must NOT silently load
    // into the play queue, or pressing play on a different surah would resume
    // that stale verse instead of the one in view. The persisted record
    // (setPlayerResume) is surfaced as an explicit, opt-in "Resume listening"
    // affordance instead — the /progress card and the Mushaf reader banner.
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
  // gap only ever runs while playing, so this never drops a live advance. The
  // sub-verse seek latch is reset here too so a stop mid-gap never strands it set.
  useEffect(() => {
    if (status !== "playing") {
      subVerseSeeking.current = false;
      if (gapTimer.current !== null) {
        clearTimeout(gapTimer.current);
        gapTimer.current = null;
      }
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
