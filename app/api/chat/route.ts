import { NextResponse } from "next/server";
import { getOrderDetails } from "@/lib/orders";
import { getOrderTool, normalizeMessages, SYSTEM_INSTRUCTION } from "@/lib/agent";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

interface GeminiPart {
  text?: string;

  functionCall?: {
    id?: string;
    name: string;
    args?: Record<string, unknown>;
  };
}

interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;

  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

function extractText(response: GeminiResponse): string {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function extractFunctionCall(response: GeminiResponse) {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .find((part) => part.functionCall)
    ?.functionCall;
}

async function callGemini(body: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY;

  const model =
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify(body),

      cache: "no-store",
    }
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `Gemini request failed with status ${response.status}`
    );
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: Message[];
    };

    const messages = body.messages ?? [];

    if (!messages.length) {
      return NextResponse.json(
        {
          error: "At least one message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const contents = normalizeMessages(messages);

    const baseRequest = {
      systemInstruction: {
        parts: [
          {
            text: SYSTEM_INSTRUCTION,
          },
        ],
      },

      contents,

      tools: [
        {
          functionDeclarations: [getOrderTool],
        },
      ],

      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 300,
      },
    };

    // --------------------------------------------------
    // FIRST GEMINI REQUEST
    // --------------------------------------------------

    let response = await callGemini(baseRequest);

    const functionCall = extractFunctionCall(response);

    let toolUsed: string | null = null;
    let toolResult: unknown = null;

    // --------------------------------------------------
    // FUNCTION CALL
    // --------------------------------------------------

    if (functionCall) {
      toolUsed = functionCall.name;

      const orderId = String(
        functionCall.args?.order_id ?? ""
      )
        .trim()
        .toUpperCase();

      if (functionCall.name === "get_order_details") {
        toolResult = orderId
          ? getOrderDetails(orderId)
          : {
              found: false,
              message:
                "No order ID was provided.",
            };
      } else {
        toolResult = {
          found: false,
          message:
            "Unknown tool requested.",
        };
      }

      // --------------------------------------------------
      // MODEL FUNCTION CALL TURN
      // --------------------------------------------------

      const modelContent =
        response.candidates?.[0]?.content;

      if (!modelContent) {
        throw new Error(
          "Gemini returned a function call without model content."
        );
      }

      // --------------------------------------------------
      // FUNCTION RESPONSE
      //
      // IMPORTANT:
      // Current Gemini API expects this as a USER
      // content turn containing functionResponse.
      // --------------------------------------------------

      const functionResponseContent = {
        role: "user",

        parts: [
          {
            functionResponse: {
              name: functionCall.name,

              ...(functionCall.id
                ? {
                    id: functionCall.id,
                  }
                : {}),

              response: {
                result:
                  toolResult ?? {
                    found: false,
                    message:
                      "No order was found.",
                  },
              },
            },
          },
        ],
      };

      // --------------------------------------------------
      // SECOND GEMINI REQUEST
      // --------------------------------------------------

      response = await callGemini({
        ...baseRequest,

        contents: [
          ...contents,

          // Preserve Gemini's original model response,
          // including its function call.
          modelContent,

          // Return our tool result.
          functionResponseContent,
        ],
      });
    }

    // --------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------

    const text =
      extractText(response) ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({
      message: text,

      toolUsed,

      toolResult,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error.";

    console.error(
      "/api/chat error:",
      message
    );

    return NextResponse.json(
      {
        error: message.includes(
          "GEMINI_API_KEY"
        )
          ? "Gemini API is not configured. Add GEMINI_API_KEY to .env.local and restart the app."
          : message,
      },
      {
        status: 500,
      }
    );
  }
}