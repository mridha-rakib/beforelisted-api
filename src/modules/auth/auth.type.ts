// file: src/modules/auth/auth.type.ts

import type { IRenterProfile, IUser } from "../user/user.interface";
import { UserResponse } from "../user/user.type";

export type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type JWTTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type AuthServiceResponse = {
  user: Omit<IUser, "password" | "emailVerificationToken">;
  tokens: JWTTokens;
};

/**

Renter Profile response
*/
export type RenterProfileResponse = Omit<IRenterProfile, "__v"> & {
  _id: string;
};

/**
 *Auth Token Response
 */
export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

/**
 *Login response
 */
export type LoginResponse = {
  user: UserResponse;
  tokens: AuthTokenResponse;
};

/**
 *Register response
 */
export type RegisterResponse = {
  user: UserResponse;
  message: string;
};
