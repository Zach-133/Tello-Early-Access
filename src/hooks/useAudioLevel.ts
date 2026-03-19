import { useState, useEffect, useRef, useCallback } from "react";

interface UseAudioLevelOptions {
  barCount?: number;
  /** Volume below this (0–1) is considered "too soft". Default: 0.04 */
  silenceThreshold?: number;
  /** Seconds after isActive=true before "too soft" warnings can fire. Default: 30 */
  initialDelaySeconds?: number;
  /** Consecutive seconds below threshold before isTooSoft becomes true. Default: 10 */
  sustainedSilenceSeconds?: number;
}

interface UseAudioLevelReturn {
  barHeights: number[];  // array of barCount values, each 0–1 (blends real amp + sine baseline)
  volume: number;        // 0–1 scaled level for VU meter (0.5 ≈ comfortable speaking level)
  isTooSoft: boolean;
}

export function useAudioLevel(
  isActive: boolean,
  {
    barCount = 9,
    silenceThreshold = 0.04,
    initialDelaySeconds = 30,
    sustainedSilenceSeconds = 10,
  }: UseAudioLevelOptions = {}
): UseAudioLevelReturn {
  const [barHeights, setBarHeights] = useState<number[]>(() => Array(barCount).fill(0));
  const [volume, setVolume] = useState(0);
  const [isTooSoft, setIsTooSoft] = useState(false);

  const rafIdRef        = useRef<number | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const dataArrayRef    = useRef<Uint8Array | null>(null);
  const activeSinceRef  = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current   = null;
    dataArrayRef.current  = null;
    activeSinceRef.current  = null;
    silenceSinceRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive) {
      cleanup();
      setBarHeights(Array(barCount).fill(0));
      setVolume(0);
      setIsTooSoft(false);
      return;
    }

    let cancelled = false;
    activeSinceRef.current = performance.now();

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;               // 128 frequency bins
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        ctx.createMediaStreamSource(stream).connect(analyser);

        const bufferLength = analyser.frequencyBinCount; // 128
        dataArrayRef.current = new Uint8Array(bufferLength);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArrayRef.current!);
          const data = dataArrayRef.current!;

          // Overall voice amplitude (mean of all bins) — drives all bars together
          // so they respond to whether voice is detected, not individual frequencies.
          let total = 0;
          for (let i = 0; i < bufferLength; i++) total += data[i];
          const rawVolume = total / bufferLength / 255;

          // Per-bar heights: overall voice level + per-bar sine phase for visual variety.
          // All bars rise/fall together with speech; when silent they oscillate gently.
          const t = performance.now() / 1000;
          const heights: number[] = [];
          for (let b = 0; b < barCount; b++) {
            // Sine baseline (0–0.20): continuous gentle movement even in silence
            const sineBase = ((Math.sin(t * 1.8 + b * 0.8) + 1) / 2) * 0.20;
            // Voice boost: overall amplitude with slight per-bar variation (±20%)
            const voiceBoost = rawVolume * (0.8 + Math.sin(b * 1.2) * 0.2);
            heights.push(Math.max(sineBase, voiceBoost));
          }
          setBarHeights(heights);

          // Scale rawVolume for the progress bar (0.5 ≈ comfortable speech level)
          const scaledVolume = Math.min(1, rawVolume * 6);
          setVolume(scaledVolume);

          // "Too soft" logic — uses raw (unscaled) volume, only after initial delay
          const now = performance.now();
          const pastInitialDelay =
            activeSinceRef.current !== null &&
            now - activeSinceRef.current >= initialDelaySeconds * 1000;

          if (pastInitialDelay) {
            if (rawVolume < silenceThreshold) {
              if (silenceSinceRef.current === null) {
                silenceSinceRef.current = now;
              } else if (now - silenceSinceRef.current >= sustainedSilenceSeconds * 1000) {
                setIsTooSoft(true);
              }
            } else {
              silenceSinceRef.current = null;
              setIsTooSoft(false);
            }
          }

          rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);
      } catch {
        // getUserMedia failed — fail silently.
        // Interview.tsx already handles permission errors during EL startup.
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
      setBarHeights(Array(barCount).fill(0));
      setVolume(0);
      setIsTooSoft(false);
    };
  }, [isActive, barCount, silenceThreshold, initialDelaySeconds, sustainedSilenceSeconds, cleanup]);

  return { barHeights, volume, isTooSoft };
}
