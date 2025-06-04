import { useEffect, useState } from "react";

export default function SpectrumAnalyzer({
  audioElement,
}: {
  audioElement: HTMLAudioElement | null;
}) {
  const [agentFFT, setAgentFFT] = useState<Float32Array | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    let lastStream: MediaStream | null = null;
    let cleanup: (() => void) | undefined;
    let pollId: number;

    const poll = () => {
      const stream = audioElement.srcObject;
      if (stream instanceof MediaStream && stream !== lastStream) {
        // Clean up previous analyser if any
        if (cleanup) cleanup();
        lastStream = stream;
        // Set up analyser for new stream
        let audioCtx = new AudioContext();
        let source = audioCtx.createMediaStreamSource(stream);
        let analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        let dataArray = new Float32Array(analyser.frequencyBinCount);
        source.connect(analyser);
        // Don't connect analyser to destination to avoid double playback
        let rafId: number;
        const update = () => {
          analyser.getFloatFrequencyData(dataArray);
          const minDb = analyser.minDecibels;
          const maxDb = analyser.maxDecibels;
          const normalized = Float32Array.from(
            dataArray,
            (v) => (v - minDb) / (maxDb - minDb)
          );
          setAgentFFT(normalized);
          rafId = requestAnimationFrame(update);
        };
        update();
        cleanup = () => {
          if (rafId) cancelAnimationFrame(rafId);
          audioCtx.close();
        };
      }
      pollId = window.setTimeout(poll, 200);
    };
    poll();

    return () => {
      if (pollId) clearTimeout(pollId);
      if (cleanup) cleanup();
    };
  }, [audioElement]);

  return agentFFT ? (
    <svg
      width={200}
      height={200}
      style={{
        background: "#111",
        display: "block",
        margin: "1rem auto",
        borderRadius: 16,
      }}
    >
      <defs>
        <radialGradient id="aiGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00fff7" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ff00ea" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#111" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      {(() => {
        // Use max magnitude, clamp between 0 and 1
        const max = Math.max(0, ...agentFFT);
        const clamped = Math.max(0, Math.min(1, max));
        // Map to radius (min 60, max 95)
        const radius = 60 + clamped * 35;
        return (
          <circle
            cx={100}
            cy={100}
            r={radius}
            fill="url(#aiGradient)"
            style={{ transition: "r 0.1s linear" }}
          />
        );
      })()}
    </svg>
  ) : null;
}
