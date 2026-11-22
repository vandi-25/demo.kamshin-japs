import "server-only";

import { isValidObjectId, type Types } from "mongoose";

import { connectDB } from "@/lib/db";
import { Order, User } from "@/lib/models";
import type { OrderStatus, Role } from "@/lib/models";
import { escapeRegex } from "@/lib/catalog";

// statuses that count as revenue
const REVENUE_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  orderCount: number;
  spentKobo: number;
};

export type CustomerOrder = { id: string; orderNumber: string; status: OrderStatus; totalKobo: number; createdAt: string };

export type CustomerDetail = Omit<CustomerRow, "orderCount" | "spentKobo"> & {
  phone: string | null;
  orders: CustomerOrder[];
  spentKobo: number;
};

type UserRow = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  addresses?: { phone: string; isDefault: boolean }[];
};

async function orderTotals(userIds: Types.ObjectId[]) {
  const rows = await Order.aggregate<{ _id: Types.ObjectId; count: number; spent: number }>([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: "$user",
        count: { $sum: 1 },
        spent: { $sum: { $cond: [{ $in: ["$status", REVENUE_STATUSES] }, "$totalKobo", 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

export async function listCustomers({ q, page = 1, perPage = 20 }: { q?: string; page?: number; perPage?: number }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  const search = q?.trim().slice(0, 80);
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const total = await User.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pageCount);
  const users = await User.find(filter)
    .select("name email role createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .skip((current - 1) * perPage)
    .limit(perPage)
    .lean<UserRow[]>();
  const totals = await orderTotals(users.map((u) => u._id));

  const items: CustomerRow[] = users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: new Date(u.createdAt).toISOString(),
    orderCount: totals.get(String(u._id))?.count ?? 0,
    spentKobo: totals.get(String(u._id))?.spent ?? 0,
  }));
  return { items, total, page: current, pageCount };
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const user = await User.findById(id).select("name email role createdAt addresses").lean<UserRow>();
  if (!user) return null;

  const orders = await Order.find({ user: user._id })
    .select("orderNumber status totalKobo createdAt")
    .sort({ createdAt: -1 })
    .lean<{ _id: Types.ObjectId; orderNumber: string; status: OrderStatus; totalKobo: number; createdAt: Date }[]>();
  const address = user.addresses?.find((a) => a.isDefault) ?? user.addresses?.[0];

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: new Date(user.createdAt).toISOString(),
    phone: address?.phone ?? null,
    orders: orders.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      status: o.status,
      totalKobo: o.totalKobo,
      createdAt: new Date(o.createdAt).toISOString(),
    })),
    spentKobo: orders.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + o.totalKobo, 0),
  };
}
