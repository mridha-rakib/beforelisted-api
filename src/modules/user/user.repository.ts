import { BaseRepository } from "@/modules/base/base.repository";
import { PaginateOptions, PaginateResult } from "mongoose";
import UserModel, { IUser } from "./user.model";

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }

  async findUserByEmail(
    email: string,
    includePassword = false
  ): Promise<IUser | null> {
    const query = this.model.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select("+password");
    }
    return query.exec();
  }

  async paginateUsers(
    query: any = {},
    options: PaginateOptions
  ): Promise<PaginateResult<IUser>> {
    return (this.model as any).paginate(query, options);
  }

  async countUsers(query: any = {}): Promise<number> {
    return this.model.countDocuments(query);
  }
}
