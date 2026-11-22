import { type HydratedDocument, type InferSchemaType, model, models, Schema } from "mongoose";

import { baseSchemaOptions, integerValidator } from "./shared";

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, validate: integerValidator },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    // null for guest carts
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        // one line per product
        validator: (items: { product: unknown }[]) =>
          new Set(items.map((i) => String(i.product))).size === items.length,
        message: "A product can only appear once in a cart",
      },
    },
  },
  baseSchemaOptions,
);

// one cart per user (guests aren't limited)
cartSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: "objectId" } } });
// guest carts expire after 60 days without changes
cartSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 60 * 24 * 60 * 60, partialFilterExpression: { user: { $type: "null" } } },
);

export type CartData = InferSchemaType<typeof cartSchema>;
export type CartDocument = HydratedDocument<CartData>;

// avoid OverwriteModelError on hot reload
const createCartModel = () => model("Cart", cartSchema);
export const Cart = (models.Cart as ReturnType<typeof createCartModel> | undefined) ?? createCartModel();
