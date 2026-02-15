// file: src/docs/swagger/notification.swagger.ts
// OpenAPI paths for Notification endpoints

export const notificationPaths = {
  "/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "Get notifications",
      description: "Get notifications for authenticated user.",
      operationId: "getNotifications",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Notifications retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/notifications/user": {
    get: {
      tags: ["Notifications"],
      summary: "Get paginated user notifications",
      operationId: "getUserNotifications",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", example: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", example: 10 },
        },
      ],
      responses: {
        "200": { description: "Notifications retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/notifications/unread-count": {
    get: {
      tags: ["Notifications"],
      summary: "Get unread notification count",
      operationId: "getUnreadNotificationCount",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Unread count retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/notifications/{notificationId}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark notification as read",
      operationId: "markNotificationAsRead",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "notificationId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Notification marked as read" },
        "401": { description: "Unauthorized" },
        "404": { description: "Notification not found" },
      },
    },
  },

  "/notifications/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read",
      operationId: "markAllNotificationsAsRead",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "All notifications marked as read" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/notifications/{notificationId}": {
    delete: {
      tags: ["Notifications"],
      summary: "Delete notification",
      operationId: "deleteNotification",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "notificationId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Notification deleted successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Notification not found" },
      },
    },
  },
};

export default notificationPaths;
