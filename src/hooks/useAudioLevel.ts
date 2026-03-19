import { useState, useEffect, useRef, useCallback } from "react";

interface UseAudioLevelOptions {
  barCount?: number;
  /** RMS below this is considered "too soft". Default: 0.015 */
  silenceThreshold?: number;
  /** Seconds after isActive=true before warning can fire. Default: 30 */
  initialDelaySeconds?: number;
  /** Consecutive seconds below threshold before isTooSoft becomes true. Default: 10 */
  sustainedSilenceSeconds?: number;
}

interface UseAudioLevelReturn {
  barHeights: number[];  // array of barCount values 0–1
  volume: number;        // 0–1 smoothed level for progress bar (0.5 ≈ normal speech)
  isTooSoft: boolean;
}

export function useAudioLevel(
  isActive: boolean,
  {
    barCount = 9,
    silenceThreshold = 0.015,
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
        // Brief delay so EL's WebRTC session fully stabilises before we open
        // a second mic stream — prevents rare audio pipeline interruptions.
        await new Promise(r => setTimeout(r, 2000));
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        // Resume immediately — AudioContext can start suspended if the page has
        // already played audio (e.g. ElevenLabs WebRTC) before this hook runs.
        if (ctx.state === 'suspended') await ctx.resume();

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;               // 256 time-domain samples (~5.8ms at 44.1kHz)
        analyser.smoothingTimeConstant = 0.0; // no smoothing — RMS handles this ourselves
        analyserRef.current = analyser;

        ctx.createMediaStreamSource(stream).connect(analyser);

        // Buffer sized for time-domain data (fftSize, not frequencyBinCount)
        dataArrayRef.current = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;

          // Time-domain waveform: values 0–255, 128 = silence centre
          analyser.getByteTimeDomainData(dataArrayRef.current!);
          const data = dataArrayRef.current!;

          // RMS amplitude — accurate, responds immediately to any voice
          let sumSq = 0;
          for (let i = 0; i < data.length; i++) {
            const s = (data[i] - 128) / 128;
            sumSq += s * s;
          }
          const rms = Math.sqrt(sumSq / data.length);
          // Typical ranges: silence ≈ 0–0.01, quiet ≈ 0.02–0.05,
          //                 normal speech ≈ 0.05–0.15, loud ≈ 0.15–0.30

          // --- Bars: all respond to overall voice level (not frequency bins) ---
          // Sine baseline keeps bars gently animated even in silence.
          const t = performance.now() / 1000;
          const heights: number[] = [];
          for (let b = 0; b < barCount; b++) {
            const sineBase = ((Math.sin(t * 1.8 + b * 0.8) + 1) / 2) * 0.20;
            // Scale rms so normal speech (0.10) → ~0.7 bar height; slight per-bar variation
            const voiceBoost = Math.min(1, rms * 7) * (0.8 + Math.sin(b * 1.2) * 0.2);
            heights.push(Math.max(sineBase, voiceBoost));
          }
          setBarHeights(heights);

          // --- Progress bar: fast rise, slow decay for live feel without jitter ---
          // Scale so normal speech (~0.10 rms) → ~0.5 on bar
          const targetVolume = Math.min(1, rms * 5);
          setVolume(prev => {
            const alpha = targetVolume > prev ? 0.6 : 0.15; // snaps up, eases down
            return prev * (1 - alpha) + targetVolume * alpha;
          });

          // --- "Too soft" detection — only after initial delay ---
          const now = performance.now();
          const pastInitialDelay =
            activeSinceRef.current !== null &&
            now - activeSinceRef.current >= initialDelaySeconds * 1000;

          if (pastInitialDelay) {
            if (rms < silenceThreshold) {
              if (silenceSinceRef.current === null) silenceSinceRef.current = now;
              else if (now - silenceSinceRef.current >= sustainedSilenceSeconds * 1000) {
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
