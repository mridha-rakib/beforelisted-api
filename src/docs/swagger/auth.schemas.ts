// file: src/docs/swagger/auth.schemas.ts
// OpenAPI schema definitions for Authentication module

export const authSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
        description: "User email address",
      },
      password: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "SecurePassword123!",
        description: "User password",
      },
    },
  },

  VerifyEmailRequest: {
    type: "object",
    required: ["email", "verificationCode"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      verificationCode: {
        type: "string",
        minLength: 6,
        example: "123456",
        description: "6-digit verification code sent to email",
      },
    },
  },

  ResendVerificationRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
    },
  },

  VerifyOTPRequest: {
    type: "object",
    required: ["email", "otp"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      otp: {
        type: "string",
        minLength: 6,
        example: "123456",
        description: "One-Time Password",
      },
    },
  },

  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
        description: "Email address to receive password reset OTP",
      },
    },
  },

  VerifyPasswordOTPRequest: {
    type: "object",
    required: ["email", "otp"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      otp: {
        type: "string",
        minLength: 6,
        example: "123456",
        description: "Password reset OTP",
      },
    },
  },

  ResetPasswordRequest: {
    type: "object",
    required: ["email", "otp", "newPassword"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      otp: {
        type: "string",
        minLength: 6,
        example: "123456",
      },
      newPassword: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "NewSecurePassword123!",
        description: "New password (min 8 characters)",
      },
    },
  },

  ResendPasswordOTPRequest: {
    type: "object",
    required: ["email"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
    },
  },

  ChangePasswordRequest: {
    type: "object",
    required: ["currentPassword", "newPassword"],
    properties: {
      currentPassword: {
        type: "string",
        format: "password",
        example: "OldPassword123!",
        description: "Current password for verification",
      },
      newPassword: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "NewPassword123!",
        description: "New password (min 8 characters)",
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  LoginResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Login successful",
      },
      data: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/UserObject",
          },
          accessToken: {
            type: "string",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            description: "JWT access token",
          },
          expiresIn: {
            type: "integer",
            example: 3600,
            description: "Token expiration time in seconds",
          },
          mustChangePassword: {
            type: "boolean",
            example: false,
            description: "Flag if password change is required",
          },
        },
      },
    },
  },

  VerifyEmailResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Email verified successfully",
      },
      data: {
        type: "object",
        properties: {
          isVerified: {
            type: "boolean",
            example: true,
          },
        },
      },
    },
  },

  VerifyOTPResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "OTP verified",
      },
      data: {
        type: "object",
      },
    },
  },

  ResendVerificationResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Verification code sent to your email",
      },
      data: {
        type: "object",
        properties: {
          expiresIn: {
            type: "integer",
            example: 600,
            description: "Verification code expiration time in seconds",
          },
        },
      },
    },
  },

  RefreshTokenResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Token refreshed successfully",
      },
      data: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          expiresIn: {
            type: "integer",
            example: 3600,
          },
        },
      },
    },
  },

  ForgotPasswordResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Password reset OTP sent to your email",
      },
      data: {
        type: "object",
        properties: {
          expiresIn: {
            type: "integer",
            example: 600,
            description: "OTP expiration time in seconds",
          },
        },
      },
    },
  },

  VerifyPasswordOTPResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "OTP verified",
      },
      data: {
        type: "object",
      },
    },
  },

  ResetPasswordResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Password reset successfully",
      },
      data: {
        type: "object",
      },
    },
  },

  ResendPasswordOTPResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "OTP resent to email",
      },
      data: {
        type: "object",
      },
    },
  },

  ChangePasswordResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Password changed successfully",
      },
      data: {
        type: "object",
      },
    },
  },

  LogoutResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Logout successful",
      },
      data: {
        type: "object",
      },
    },
  },

  // ==========================================
  // COMMON SCHEMAS
  // ==========================================

  UserObject: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
        description: "Unique user ID",
      },
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      role: {
        type: "string",
        enum: ["admin", "agent", "renter", "user"],
        example: "user",
      },
      isEmailVerified: {
        type: "boolean",
        example: true,
      },
      isActive: {
        type: "boolean",
        example: true,
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2024-01-15T10:30:00Z",
      },
    },
  },

  ErrorResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      statusCode: {
        type: "integer",
        example: 400,
      },
      message: {
        type: "string",
        example: "Error message",
      },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: {
              type: "string",
              example: "email",
            },
            message: {
              type: "string",
              example: "Invalid email format",
            },
          },
        },
      },
    },
  },
};

export default authSchemas;