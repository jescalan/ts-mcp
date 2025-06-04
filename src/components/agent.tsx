import { useRef, useEffect, useState } from "react";
import {
  RealtimeAgent,
  RealtimeSession,
  tool,
  OpenAIRealtimeWebRTC,
} from "@openai/agents/realtime";
import { z } from "zod";

import { getAgentToken, getGuitars } from "@/utils/demo.ai";

export function Agent() {
  const apiKey = useRef<string | null>(null);
  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [agentFFT, setAgentFFT] = useState<Float32Array | null>(null);
  const agentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const init = async () => {
      if (agentRef.current || !agentAudioElementRef.current) return;

      const { token } = await getAgentToken();
      apiKey.current = token;

      const getGuitarListTool = tool({
        name: "get_guitar_list",
        description: "Get the list of guitars",
        parameters: z.object({}),
        async execute() {
          return await getGuitars();
        },
      });

      agentRef.current = new RealtimeAgent({
        voice: "alloy",
        name: "Guitar Assistant",
        instructions:
          "You are a helpful assistant that can help the user find the perfect guitar. You can use the getGuitarListTool to get the list of guitars.",
        tools: [getGuitarListTool],
      });

      const transport = new OpenAIRealtimeWebRTC({
        mediaStream: await navigator.mediaDevices.getUserMedia({ audio: true }),
        audioElement: agentAudioElementRef.current!,
      });

      sessionRef.current = new RealtimeSession(agentRef.current, {
        transport,
      });
      await sessionRef.current.connect({
        apiKey: apiKey.current,
      });
      sessionRef.current.on("history_updated", (history) => {
        // returns the full history of the session
        console.log(history);
      });
    };
    init();
  }, []);

  useEffect(() => {
    const audioEl = agentAudioElementRef.current;
    if (!audioEl) return;

    let lastStream: MediaStream | null = null;
    let cleanup: (() => void) | undefined;
    let pollId: number;

    const poll = () => {
      const stream = audioEl.srcObject;
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
  }, []);

  return (
    <div>
      {agentFFT && (
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
      )}
      <audio ref={agentAudioElementRef} className="w-64 h-10" />
    </div>
  );
}
