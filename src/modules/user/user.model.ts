import {
  createPaginatedModel,
  createPaginatedSchema,
} from "@/utils/base-schema.utils";
import { Document, Schema } from "mongoose";

export type UserRole =
  | "SuperAdmin"
  | "Admin"
  | "Supervisor"
  | "Counsellor"
  | "Clinician";

export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  zoomMeetingLink?: string;
  profileImage?: string;
  fcmToken?: string;
  lastLogin?: Date;
  createdBy?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  bookmarkedResources?: Schema.Types.ObjectId[];
}

const UserSchema = createPaginatedSchema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["SuperAdmin", "Admin", "Supervisor", "Counsellor", "Clinician"],
    required: true,
    index: true,
  },
  phoneNumber: { type: String },
  zoomMeetingLink: { type: String },
  profileImage: { type: String },
  fcmToken: { type: String },
  lastLogin: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  bookmarkedResources: [{ type: Schema.Types.ObjectId, ref: "Resource" }],
});

export default createPaginatedModel<IUser>("User", UserSchema);
