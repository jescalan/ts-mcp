import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { showAIAssistant } from "../store/example-assistant";
import GuitarRecommendation from "./example-GuitarRecommendation";

import {
  RealtimeAgent,
  RealtimeSession,
  tool,
  OpenAIRealtimeWebRTC,
} from "@openai/agents/realtime";
import { z } from "zod";

import { getAgentToken, getGuitars } from "@/utils/demo.ai";
import SpectrumAnalyzer from "./spectrum-analyzer";

type Message = {
  content: {
    transcript?: string;
    text?: string;
  }[];
  itemId: string;
  role: "user" | "assistant";
};

function Messages({ messages }: { messages: Array<Message> }) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const result: {
      itemId: string;
      role: "user" | "assistant";
      text: string;
    }[] = [];
    for (const message of messages) {
      for (const index in message.content) {
        const part = message.content[index];
        if (part.transcript || part.text) {
          result.push({
            itemId: `${message.itemId}-${index}`,
            role: message.role,
            text: part.transcript || part.text || "",
          });
        }
      }
    }
    return result;
  }, [messages]);

  if (!filteredMessages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Ask me anything! I'm here to help.
      </div>
    );
  }

  return (
    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
      {filteredMessages.map(({ itemId, role, text }) => (
        <div
          key={itemId}
          className={`py-3 ${
            role === "assistant"
              ? "bg-gradient-to-r from-orange-500/5 to-red-600/5"
              : "bg-transparent"
          }`}
        >
          {text.length > 0 && (
            <div className="flex items-start gap-2 px-4">
              {role === "assistant" ? (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                  AI
                </div>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                  Y
                </div>
              )}
              <div className="flex-1 min-w-0">
                <ReactMarkdown
                  className="prose dark:prose-invert max-w-none prose-sm"
                  rehypePlugins={[
                    rehypeRaw,
                    rehypeSanitize,
                    rehypeHighlight,
                    remarkGfm,
                  ]}
                >
                  {text}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AIAssistantDialog() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<Message>>([]);

  const apiKey = useRef<string | null>(null);
  const agentRef = useRef<RealtimeAgent | null>(null);
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [agentAudioElement, setAgentAudioElement] =
    useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const init = async () => {
      if (agentRef.current || !agentAudioElement) return;

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
        audioElement: agentAudioElement,
      });

      sessionRef.current = new RealtimeSession(agentRef.current, {
        transport,
      });
      await sessionRef.current.connect({
        apiKey: apiKey.current,
      });
      sessionRef.current.on("history_updated", (history) => {
        console.log(">>> history_updated", history);
        setMessages(history as Message[]);
      });
    };
    init();

    return () => {
      if (sessionRef.current) {
        console.log(">>> closing session");
        sessionRef.current.close();
      }
    };
  }, [agentAudioElement]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sessionRef.current?.sendMessage({
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: input,
          },
        ],
      });
      setInput("");
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-[700px] h-[600px] bg-gray-900 rounded-lg shadow-xl border border-orange-500/20 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-orange-500/20">
        <h3 className="font-semibold text-white">AI Assistant</h3>
        <button
          onClick={() => showAIAssistant.setState((state) => !state)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <audio ref={(r) => setAgentAudioElement(r)} />
      <SpectrumAnalyzer audioElement={agentAudioElement} />

      <Messages messages={messages} />

      <div className="p-3 border-t border-orange-500/20">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-lg border border-orange-500/20 bg-gray-800/50 pl-3 pr-10 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent resize-none overflow-hidden"
            rows={1}
            style={{ minHeight: "36px", maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleInputKeyDown}
          />
          <button
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-500 hover:text-orange-400 disabled:text-gray-500 transition-colors focus:outline-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
