import { useState, useEffect, useRef, useCallback } from "react";

interface UseAudioLevelOptions {
  barCount?: number;
  /** Volume below this (0–1) is considered "too soft". Default: 0.08 */
  silenceThreshold?: number;
  /** Seconds after isActive=true before "too soft" warnings can fire. Default: 20 */
  initialDelaySeconds?: number;
  /** Consecutive seconds below threshold before isTooSoft becomes true. Default: 5 */
  sustainedSilenceSeconds?: number;
}

interface UseAudioLevelReturn {
  barHeights: number[];  // array of barCount values, each 0–1
  isTooSoft: boolean;
}

export function useAudioLevel(
  isActive: boolean,
  {
    barCount = 9,
    silenceThreshold = 0.08,
    initialDelaySeconds = 20,
    sustainedSilenceSeconds = 5,
  }: UseAudioLevelOptions = {}
): UseAudioLevelReturn {
  const [barHeights, setBarHeights] = useState<number[]>(() => Array(barCount).fill(0));
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

          // Per-bar heights: divide frequency bins into barCount groups
          const binsPerBar = Math.floor(bufferLength / barCount);
          const heights: number[] = [];
          for (let b = 0; b < barCount; b++) {
            let sum = 0;
            const start = b * binsPerBar;
            for (let k = start; k < start + binsPerBar; k++) sum += data[k];
            heights.push((sum / binsPerBar) / 255);
          }
          setBarHeights(heights);

          // Overall volume (mean across all bins)
          let total = 0;
          for (let i = 0; i < bufferLength; i++) total += data[i];
          const overallVolume = total / bufferLength / 255;

          // "Too soft" logic — only fires after initial delay
          const now = performance.now();
          const pastInitialDelay =
            activeSinceRef.current !== null &&
            now - activeSinceRef.current >= initialDelaySeconds * 1000;

          if (pastInitialDelay) {
            if (overallVolume < silenceThreshold) {
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
        // barHeights stay at zero, rendering as minimal-height bars.
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
      setBarHeights(Array(barCount).fill(0));
      setIsTooSoft(false);
    };
  }, [isActive, barCount, silenceThreshold, initialDelaySeconds, sustainedSilenceSeconds, cleanup]);

  return { barHeights, isTooSoft };
}
