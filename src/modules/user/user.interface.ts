export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "agent" | "renter";
  hasGrantAccess?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      _id: string;
      email: string;
      profileImage: string;
      role: string;
    };
    accessToken: string;
    refreshToken?: string;
  };
  message?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
  };
  message?: string;
}
