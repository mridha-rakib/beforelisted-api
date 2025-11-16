import { env } from "@/env";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
  }),
});

export const messaging = admin.messaging();
