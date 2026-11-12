// file: src/utils/transaction.utils.ts

import type { ClientSession } from "mongoose";

import mongoose from "mongoose";

export class TransactionHelper {
  static async withTransaction<T>(
    callback: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() => callback(session));
    }
    finally {
      await session.endSession();
    }
  }
}
