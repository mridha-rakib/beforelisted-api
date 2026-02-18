// file: src/modules/auth/auth.interface.ts

export interface IRegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: "Agent" | "Renter";
  licenseNumber?: string;
  brokerageName?: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
  referralCode?: string;
}

export interface IVerifyEmailRequest {
  token: string;
}

export interface IRequestPasswordResetRequest {
  email: string;
}

export interface IVerifyOTPRequest {
  email: string;
  otp: string;
}

export interface IResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  };
}
