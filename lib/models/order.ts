import { type HydratedDocument, type InferSchemaType, model, models, Schema } from "mongoose";

import { baseSchemaOptions, integerValidator, koboField } from "./shared";

export const ORDER_STATUSES = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// line items are copies, so editing a product later doesn't change old orders
const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unitPriceKobo: koboField,
    quantity: { type: Number, required: true, min: 1, validate: integerValidator },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    // e.g. KMS-260930-7F3K2Q
    orderNumber: { type: String, required: true, unique: true },
    // don't delete users who have orders
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "PENDING", required: true },
    subtotalKobo: koboField,
    shippingKobo: koboField,
    totalKobo: koboField,
    paystackReference: { type: String, required: true, unique: true },
    paidAt: { type: Date },
    shippingAddress: { type: shippingAddressSchema, required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items: unknown[]) => items.length > 0, message: "An order needs at least one item" },
    },
  },
  baseSchemaOptions,
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
// used to check if a product was ever ordered
orderSchema.index({ "items.product": 1 });

export type OrderData = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<OrderData>;

// avoid OverwriteModelError on hot reload
const createOrderModel = () => model("Order", orderSchema);
export const Order = (models.Order as ReturnType<typeof createOrderModel> | undefined) ?? createOrderModel();
