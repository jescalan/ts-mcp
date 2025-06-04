import { createServerFn } from "@tanstack/react-start";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

import getTools from "./demo.tools";
import guitars from "../data/example-guitars";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

You can use the following tools to help the user:

- getGuitars: Get all guitars from the database
- recommendGuitar: Recommend a guitar to the user
`;

export const getGuitars = createServerFn({ method: "GET" }).handler(
  async () => {
    return guitars;
  }
);

export const getAgentToken = createServerFn({ method: "GET" }).handler(
  async () => {
    console.log(">> getAgentToken");
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
        }),
      }
    );
    const data = await response.json();
    console.log(data);
    return {
      token: data.client_secret.value,
    } as { token: string };
  }
);

export const genAIResponse = createServerFn({ method: "POST", response: "raw" })
  .validator(
    (d: {
      messages: Array<Message>;
      systemPrompt?: { value: string; enabled: boolean };
    }) => d
  )
  .handler(async ({ data }) => {
    const messages = data.messages
      .filter(
        (msg) =>
          msg.content.trim() !== "" &&
          !msg.content.startsWith("Sorry, I encountered an error")
      )
      .map((msg) => ({
        role: msg.role,
        content: msg.content.trim(),
      }));

    const tools = await getTools();

    try {
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages,
        system: SYSTEM_PROMPT,
        maxSteps: 10,
        tools,
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error("Error in genAIResponse:", error);
      if (error instanceof Error && error.message.includes("rate limit")) {
        return { error: "Rate limit exceeded. Please try again in a moment." };
      }
      return {
        error:
          error instanceof Error ? error.message : "Failed to get AI response",
      };
    }
  });
