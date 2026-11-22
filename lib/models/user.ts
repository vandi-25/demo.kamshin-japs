import { type HydratedDocument, type InferSchemaType, model, models, Schema } from "mongoose";

import { baseSchemaOptions } from "./shared";

export const ROLES = ["CUSTOMER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

// Addresses are stored on the user. Orders keep their own copy.
const addressSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // not returned unless you .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "CUSTOMER", required: true },
    addresses: { type: [addressSchema], default: [] },
  },
  baseSchemaOptions,
);

userSchema.index({ role: 1, createdAt: -1 });

export type UserData = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserData>;

// avoid OverwriteModelError on hot reload
const createUserModel = () => model("User", userSchema);
export const User = (models.User as ReturnType<typeof createUserModel> | undefined) ?? createUserModel();
