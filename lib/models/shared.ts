import type { SchemaOptions } from "mongoose";

// null/undefined pass here, `required` handles those
const isWholeNumber = (value: unknown) => value == null || Number.isInteger(value);

// Shared schema options: timestamps, and toJSON/toObject return `id` instead of _id/__v so docs
// match what the UI expects. toJSON always strips passwordHash.
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      delete ret.passwordHash;
      return ret;
    },
  },
  toObject: { virtuals: true, versionKey: false },
} satisfies SchemaOptions;

// integer kobo
export const koboField = {
  type: Number,
  required: true,
  min: 0,
  validate: { validator: isWholeNumber, message: "Amounts must be whole kobo" },
} as const;

export const integerValidator = { validator: isWholeNumber, message: "{PATH} must be a whole number" };
