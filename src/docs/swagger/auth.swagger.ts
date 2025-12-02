// File: src/docs/swagger/auth.swagger.ts
// Authentication Module - Endpoint Documentation

const authPaths = {
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "User Login",
      description:
        "Authenticate user with email and password. Returns JWT tokens and user information.",
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
        "401": {
          description: "Invalid credentials",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
            },
          },
        },
        "422": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationErrorResponse",
              },
            },
          },
        },
      },
    },
  },

  "/auth/verify-email": {
    post: {
      tags: ["Authentication"],
      summary: "Verify Email Address",
      description:
        "Verify user email with 4-digit code sent to email during registration.",
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
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Email verified successfully",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired verification code",
        },
        "422": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationErrorResponse",
              },
            },
          },
        },
      },
    },
  },

  "/auth/resend-verification": {
    post: {
      tags: ["Authentication"],
      summary: "Resend Verification Code",
      description: "Resend verification code to registered email address.",
      operationId: "resendVerification",
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
          description: "Verification code resent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Verification code sent to email",
                  },
                },
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

  "/auth/verify-otp": {
    post: {
      tags: ["Authentication"],
      summary: "Verify OTP (Password Reset)",
      description: "Verify OTP code for password reset verification.",
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
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "OTP verified. Proceed with password reset.",
                  },
                },
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

  "/auth/request-password-reset": {
    post: {
      tags: ["Authentication - Password Reset"],
      summary: "Request Password Reset",
      description: "Request password reset by sending OTP to registered email.",
      operationId: "requestPasswordReset",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RequestPasswordResetRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OTP sent to email for password reset",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "OTP sent to your email. Valid for 10 minutes.",
                  },
                },
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

  "/auth/reset-password": {
    post: {
      tags: ["Authentication - Password Reset"],
      summary: "Reset Password",
      description: "Reset password using email, OTP, and new password.",
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
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example:
                      "Password reset successfully. Please login with new password.",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid OTP or expired token",
        },
      },
    },
  },

  "/auth/change-password": {
    put: {
      tags: ["Authentication - Password Reset"],
      summary: "Change Password (Authenticated)",
      description:
        "Change password for authenticated user. Requires current password verification.",
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
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Password changed successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized or invalid current password",
        },
        "422": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationErrorResponse",
              },
            },
          },
        },
      },
    },
  },

  "/auth/refresh-token": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh Access Token",
      description: "Get new access token using refresh token from cookie.",
      operationId: "refreshToken",
      security: [
        {
          cookieAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "New access token generated",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshTokenResponse",
              },
            },
          },
        },
        "401": {
          description: "Invalid or expired refresh token",
        },
      },
    },
  },

  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "User Logout",
      description: "Logout user and clear authentication tokens.",
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
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "Logged out successfully",
                  },
                },
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
