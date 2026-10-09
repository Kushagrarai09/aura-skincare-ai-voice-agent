export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
  timestamp?: string;
}

export interface Order {
  order_id: string;
  customer: string;
  product: string;
  value: number;
  status: string;
  notes: string;
}

export interface CallSummary {
  customer_intent: string;
  order_id: string | null;
  resolution_status: "RESOLVED" | "UNRESOLVED" | "PARTIALLY_RESOLVED" | "OUT_OF_SCOPE";
  call_summary: string;
  tool_used: string | null;
  key_policy: string | null;
}
