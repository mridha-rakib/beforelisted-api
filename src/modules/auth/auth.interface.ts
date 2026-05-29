// file: src/modules/auth/auth.interface.ts

export type IRegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: "Agent" | "Renter";
  licenseNumber?: string;
  brokerageName?: string;
};

export type ILoginRequest = {
  email: string;
  password: string;
  referralCode?: string;
};

export type IVerifyEmailRequest = {
  token: string;
};

export type IRequestPasswordResetRequest = {
  email: string;
};

export type IVerifyOTPRequest = {
  email: string;
  otp: string;
};

export type IResetPasswordRequest = {
  email: string;
  otp: string;
  newPassword: string;
};

export type IRefreshTokenRequest = {
  refreshToken: string;
};

export type IAuthResponse = {
  success: boolean;
  message: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  };
};
