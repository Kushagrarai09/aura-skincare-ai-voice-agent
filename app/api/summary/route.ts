
import { NextResponse } from "next/server";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

type Summary = {
  customer_intent: string;
  order_id: string | null;
  resolution_status:
    | "RESOLVED"
    | "UNRESOLVED"
    | "PARTIALLY_RESOLVED"
    | "OUT_OF_SCOPE";
  call_summary: string;
  tool_used: string | null;
  key_policy: string | null;
};

function createSummary(
  messages: Message[],
  toolUsed?: string | null,
): Summary {
  const conversation = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  const customerText = conversation
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const agentText = conversation
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join(" ");

  const fullText = `${customerText} ${agentText}`;
  const normalized = fullText.toLowerCase();

  // Detect an order ID mentioned in the conversation.
  const orderMatch = fullText.match(/\bORD[\s-]?(\d{3})\b/i);
  const shortOrderMatch = !orderMatch
    ? customerText.match(/\border\s+(\d{3})\b/i)
    : null;

  const orderId = orderMatch
    ? `ORD-${orderMatch[1]}`
    : shortOrderMatch
      ? `ORD-${shortOrderMatch[1]}`
      : null;

  let intent = "GENERAL_SUPPORT";

  if (
    /\b(flight|book a flight|weather|recipe|unrelated)\b/i.test(customerText)
  ) {
    intent = "OUT_OF_SCOPE";
  } else if (/\b(cancel|cancellation)\b/i.test(customerText)) {
    intent = "ORDER_CANCELLATION";
  } else if (/\b(return|refund|exchange)\b/i.test(customerText)) {
    intent = "RETURN_OR_REFUND";
  } else if (
    /\b(deliver|delivery|track|tracking|where is my order|where is order|shipped)\b/i.test(
      customerText,
    )
  ) {
    intent = "ORDER_TRACKING";
  } else if (/\b(price|cost|product|ingredient|use|usage)\b/i.test(customerText)) {
    intent = "PRODUCT_INFORMATION";
  }

  let status: Summary["resolution_status"] = "UNRESOLVED";

  if (intent === "OUT_OF_SCOPE") {
    status = "OUT_OF_SCOPE";
  } else if (conversation.length <= 1) {
    status = "UNRESOLVED";
  } else {
    const lastCustomerMessage = [...conversation]
      .reverse()
      .find((m) => m.role === "user")?.content ?? "";

    const lastAgentMessage = [...conversation]
      .reverse()
      .find((m) => m.role === "assistant")?.content ?? "";

    const lastAgentLower = lastAgentMessage.toLowerCase();

    const explicitlyUnavailable =
      /\b(exact|specific).{0,35}\b(not available|doesn't provide|cannot provide|don't have|unknown)\b/i.test(
        lastAgentMessage,
      ) ||
      /\b(can't|cannot|unable to)\s+(cancel|process|complete|provide)\b/i.test(
        lastAgentMessage,
      );

    const asksFollowUp =
      /\?\s*$/.test(lastAgentMessage.trim()) &&
      !/\b(is there anything else|anything else i can help)\b/i.test(
        lastAgentMessage,
      );

    const agentResponded = lastAgentMessage.trim().length > 0;
    const customerAskedSomething =
      lastCustomerMessage.trim().length > 0;

    if (agentResponded && customerAskedSomething) {
      status =
        explicitlyUnavailable || asksFollowUp
          ? "PARTIALLY_RESOLVED"
          : "RESOLVED";
    }
  }

  let policy: string | null = null;

  if (/\b(out for delivery|shipped)\b/i.test(agentText)) {
    policy = "Orders cannot be cancelled once shipped or out for delivery.";
  } else if (/\bprocessing\b/i.test(agentText) && intent === "ORDER_CANCELLATION") {
    policy = "Cancellation is allowed only while an order is Processing.";
  } else if (/\b3 to 5|3–5|3-5\b/i.test(agentText)) {
    policy = "Standard delivery typically takes 3–5 business days once shipped.";
  } else if (/\bwithin 7 days\b/i.test(agentText)) {
    policy = "Returns are allowed within 7 days of delivery for eligible products.";
  } else if (/\b48 hours\b/i.test(agentText)) {
    policy = "Damaged or defective items must be reported within 48 hours with photos.";
  } else if (/\bfree delivery\b/i.test(agentText)) {
    policy = "Free delivery applies to orders above ₹499; otherwise shipping is ₹50.";
  }

  const transcript = conversation
    .map((m) => `${m.role === "user" ? "Customer" : "Aria"}: ${m.content}`)
    .join(" ");

  const callSummary = transcript
    ? transcript.length > 900
      ? `${transcript.slice(0, 897)}...`
      : transcript
    : "No conversation transcript was available.";

  return {
    customer_intent: intent,
    order_id: orderId,
    resolution_status: status,
    call_summary: callSummary,
    tool_used: toolUsed || null,
    key_policy: policy,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: Message[];
      toolUsed?: string | null;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const summary = createSummary(messages, body.toolUsed);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("/api/summary error:", error);

    return NextResponse.json(
      { error: "Could not create the structured call summary." },
      { status: 400 },
    );
  }
}
