import { join } from 'path';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  clientUrl: string;
  /** Absolute path on disk where uploaded files (avatars, ...) are stored.
   * Deliberately outside `dist/` (which `nest build` wipes and regenerates
   * every deploy) so uploads survive a redeploy. */
  uploadsDir: string;
}

export interface FirebaseConfig {
  /** Path to the Firebase Admin SDK service-account JSON (Firebase Console
   * > Project Settings > Service Accounts > Generate new private key).
   * `null` disables push sending entirely — `PushNotificationService`
   * no-ops rather than throwing, so the rest of the app works fine without
   * it configured (e.g. in local dev). */
  serviceAccountPath: string | null;
}

export interface DatabaseConfig {
  uri: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    clientUrl: process.env.CLIENT_URL,
    uploadsDir: process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'),
  },
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? null,
  },
  database: {
    uri: process.env.MONGO_URI,
  },
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
});
