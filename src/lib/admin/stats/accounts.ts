import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { change, type Period, type Range } from "@/lib/admin/period";
import { Subscription } from "@/models/Subscription";
import { bucketExpr, fillBuckets } from "./buckets";

export interface MrrRow {
  currency: string;
  /** Monthly recurring revenue: monthly plans + yearly plans / 12. */
  amount: number;
  subscriptions: number;
}

export interface AccountStats {
  /** All registered users right now. */
  totalUsers: number;
  newUsers: number;
  previousNewUsers: number;
  change: number | null;
  newUsersPerBucket: Array<{ key: string; count: number }>;
  /** Subscriptions with status "active" right now. */
  activeSubscriptions: number;
  /** Subscriptions started in the period (any that got past "pending"). */
  newSubscriptions: number;
  /** Subscriptions cancelled in the period. */
  cancellations: number;
  mrr: MrrRow[];
}

/**
 * Auth.js does not store a creation date, but user ids are ObjectIds, whose
 * first bytes are the creation time: ranges on `_id` use its index.
 */
function idRange({ start, end }: Range) {
  return {
    _id: {
      $gte: mongoose.Types.ObjectId.createFromTime(Math.floor(start.getTime() / 1000)),
      $lt: mongoose.Types.ObjectId.createFromTime(Math.floor(end.getTime() / 1000)),
    },
  };
}

/** Users, subscriptions and recurring revenue for the admin panel. */
export async function accountStats(period: Period): Promise<AccountStats> {
  const { connection } = await connectToDatabase();
  const users = connection.collection("users");
  const [totalUsers, perBucket, previousNewUsers, activeSubscriptions, newSubscriptions, cancellations, mrr] =
    await Promise.all([
      users.estimatedDocumentCount(),
      users
        .aggregate<{ _id: string; count: number }>([
          { $match: idRange(period) },
          // `$dateToString` of an ObjectId reads its timestamp.
          { $group: { _id: bucketExpr(period.bucket, "$_id"), count: { $sum: 1 } } },
        ])
        .toArray(),
      users.countDocuments(idRange(period.previous)),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ createdAt: { $gte: period.start, $lt: period.end }, status: { $ne: "pending" } }),
      Subscription.countDocuments({ cancelledAt: { $gte: period.start, $lt: period.end } }),
      Subscription.aggregate<{ _id: string; amount: number; subscriptions: number }>([
        { $match: { status: "active" } },
        {
          $group: {
            _id: "$currency",
            amount: { $sum: { $cond: [{ $eq: ["$period", "yearly"] }, { $divide: ["$amount", 12] }, "$amount"] } },
            subscriptions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);
  const newUsersPerBucket = fillBuckets(period, perBucket, { count: 0 });
  const newUsers = newUsersPerBucket.reduce((sum, b) => sum + b.count, 0);
  return {
    totalUsers,
    newUsers,
    previousNewUsers,
    change: change(newUsers, previousNewUsers),
    newUsersPerBucket,
    activeSubscriptions,
    newSubscriptions,
    cancellations,
    mrr: mrr.map(({ _id, amount, subscriptions }) => ({
      currency: _id,
      amount: Math.round(amount * 100) / 100,
      subscriptions,
    })),
  };
}
