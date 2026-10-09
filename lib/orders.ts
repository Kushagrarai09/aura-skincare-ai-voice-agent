import orders from "@/data/orders.json";
import type { Order } from "./types";

export function getOrderDetails(orderId: string): Order | null {
  const normalized = orderId.trim().toUpperCase();
  return (orders as Order[]).find((order) => order.order_id === normalized) ?? null;
}

export function getAllOrders(): Order[] {
  return orders as Order[];
}
