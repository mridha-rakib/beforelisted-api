// file: src/utils/transaction.utils.ts
import type { Session } from "mongoose";
import mongoose from "mongoose";

export class TransactionHelper {
  static async withTransaction<T>(
    callback: (session: Session) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

// Usage:
// const result = await TransactionHelper.withTransaction(async (session) => {
//   // Multi-step operation
// });
