import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    provider: { type: String, enum: ["mercadopago", "international", "mock"], required: true },
    /** The provider's id (Mercado Pago preapproval id). */
    externalId: { type: String, required: true, unique: true },
    region: { type: String, required: true },
    period: { type: String, enum: ["monthly", "yearly"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ["pending", "active", "paused", "cancelled"], default: "pending", index: true },
    /** Paid access lasts until here, even after cancelling. */
    currentPeriodEnd: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema> & { _id: mongoose.Types.ObjectId };

export const Subscription: Model<InferSchemaType<typeof subscriptionSchema>> =
  (mongoose.models.Subscription as Model<InferSchemaType<typeof subscriptionSchema>>) ??
  mongoose.model("Subscription", subscriptionSchema);
