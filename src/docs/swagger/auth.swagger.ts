// file: src/docs/swagger/auth.swagger.ts
// Complete OpenAPI paths for Authentication endpoints

export const authPaths = {
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login user",
      description: "Authenticate user with email and password. Sets refresh token in httpOnly cookie.",
      operationId: "loginUser",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LoginRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid credentials",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - Invalid email or password",
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/auth/verify-email": {
    post: {
      tags: ["Authentication"],
      summary: "Verify email with verification code",
      description: "Verify user's email address using the verification code sent to their email.",
      operationId: "verifyEmail",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/VerifyEmailRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Email verified successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyEmailResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired verification code",
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/auth/resend-verification": {
    post: {
      tags: ["Authentication"],
      summary: "Resend verification code",
      description: "Request a new verification code to be sent to the user's email.",
      operationId: "resendVerificationCode",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResendVerificationRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Verification code sent successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ResendVerificationResponse",
              },
            },
          },
        },
        "400": {
          description: "Bad request",
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/auth/verify-otp": {
    post: {
      tags: ["Authentication"],
      summary: "Verify OTP code",
      description: "Verify OTP sent to user's email for password reset or authentication.",
      operationId: "verifyOTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/VerifyOTPRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OTP verified successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyOTPResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired OTP",
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/auth/refresh-token": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh access token",
      description: "Get a new access token using the refresh token stored in cookie.",
      operationId: "refreshAccessToken",
      responses: {
        "200": {
          description: "Access token refreshed successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshTokenResponse",
              },
            },
          },
        },
        "401": {
          description: "Refresh token expired or invalid",
        },
      },
    },
  },

  "/auth/forgot-password": {
    post: {
      tags: ["Password Reset"],
      summary: "Request password reset",
      description: "Request a password reset OTP to be sent to the user's email.",
      operationId: "forgotPassword",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ForgotPasswordRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset OTP sent to email",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ForgotPasswordResponse",
              },
            },
          },
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/auth/verify-password-otp": {
    post: {
      tags: ["Password Reset"],
      summary: "Verify password reset OTP",
      description: "Verify the OTP sent for password reset.",
      operationId: "verifyPasswordOTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/VerifyPasswordOTPRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OTP verified successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyPasswordOTPResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired OTP",
        },
      },
    },
  },

  "/auth/reset-password": {
    post: {
      tags: ["Password Reset"],
      summary: "Reset password with OTP",
      description: "Reset user password using verified OTP.",
      operationId: "resetPassword",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResetPasswordRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ResetPasswordResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired OTP",
        },
      },
    },
  },

  "/auth/resend-password-otp": {
    post: {
      tags: ["Password Reset"],
      summary: "Resend password reset OTP",
      description: "Request a new password reset OTP to be sent to email.",
      operationId: "resendPasswordOTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResendPasswordOTPRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password reset OTP resent to email",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ResendPasswordOTPResponse",
              },
            },
          },
        },
      },
    },
  },

  "/auth/change-password": {
    put: {
      tags: ["Authentication"],
      summary: "Change password (authenticated user)",
      description: "Change password for authenticated user. Requires current password verification.",
      operationId: "changePassword",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ChangePasswordRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password changed successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangePasswordResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid current password",
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },

  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Logout user",
      description: "Logout authenticated user. Clears refresh token cookie.",
      operationId: "logout",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Logout successful",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LogoutResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },
};

export default authPaths;