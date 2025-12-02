// file: src/docs/swagger/auth.schemas.ts
// Authentication Module - Reusable Schemas

const authSchemas = {
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
        example: "SecurePass123!",
        description: "User password (minimum 8 characters)",
      },
    },
  },
  LoginResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              _id: {
                type: "string",
                example: "507f1f77bcf86cd799439011",
              },
              email: {
                type: "string",
                example: "user@example.com",
              },
              fullName: {
                type: "string",
                example: "John Doe",
              },
              role: {
                type: "string",
                enum: ["renter", "agent", "admin"],
                example: "renter",
              },
            },
          },
          tokens: {
            type: "object",
            properties: {
              accessToken: {
                type: "string",
                description: "JWT access token (expires in 1 hour)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
              refreshToken: {
                type: "string",
                description: "JWT refresh token (stored in httpOnly cookie)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
              expiresIn: {
                type: "string",
                example: "1h",
              },
            },
          },
        },
      },
      message: {
        type: "string",
        example: "Login successful",
      },
    },
  },

  VerifyEmailRequest: {
    type: "object",
    required: ["email", "code"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      code: {
        type: "string",
        description: "4-digit verification code sent to email",
        example: "1234",
        minLength: 4,
        maxLength: 4,
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
        description: "4-digit OTP for password reset",
        example: "5678",
        minLength: 4,
        maxLength: 4,
      },
    },
  },

  RequestPasswordResetRequest: {
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
        description: "4-digit OTP",
        example: "5678",
        minLength: 4,
        maxLength: 4,
      },
      newPassword: {
        type: "string",
        format: "password",
        example: "NewSecurePass123!",
        description: "New password (minimum 8 characters)",
      },
    },
  },

  ChangePasswordRequest: {
    type: "object",
    required: ["currentPassword", "newPassword", "confirmPassword"],
    properties: {
      currentPassword: {
        type: "string",
        format: "password",
        example: "CurrentPass123!",
        description: "Current password for verification",
      },
      newPassword: {
        type: "string",
        format: "password",
        example: "NewSecurePass123!",
        description:
          "New password (minimum 8 characters, must be different from current)",
      },
      confirmPassword: {
        type: "string",
        format: "password",
        example: "NewSecurePass123!",
        description: "Must match newPassword",
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
      userType: {
        type: "string",
        enum: ["Agent", "Renter", "Admin"],
        description: "Optional: specify user type",
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
      data: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
            description: "New JWT access token",
          },
          expiresIn: {
            type: "string",
            example: "1h",
          },
        },
      },
      message: {
        type: "string",
        example: "Token refreshed successfully",
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
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            example: "INVALID_CREDENTIALS",
          },
          message: {
            type: "string",
            example: "Invalid email or password",
          },
          statusCode: {
            type: "number",
            example: 401,
          },
        },
      },
    },
  },

  ValidationErrorResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: false,
      },
      error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            example: "VALIDATION_ERROR",
          },
          message: {
            type: "string",
            example: "Validation failed",
          },
          details: {
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
    },
  },
};

export default authSchemas;
