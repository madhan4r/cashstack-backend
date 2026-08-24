import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { App, cert, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { AppConfigService } from '../config/app-config.service';
import { UsersService } from '../users/users.service';
import { categoryForType, isCategoryEnabled } from './notification-category';
import { NotificationRecordService } from './notification-record.service';

export interface PushPayload {
  title: string;
  body: string;
  /** String-only, per FCM's data-message requirement. */
  data?: Record<string, string>;
}

/**
 * Thin wrapper around firebase-admin. Deliberately tolerant of missing
 * configuration — `FIREBASE_SERVICE_ACCOUNT_PATH` is unset in local dev and
 * on any deployment that hasn't set up a Firebase project yet, and the rest
 * of the app (including everything that calls `sendToUser`) should keep
 * working without it; sends just silently no-op.
 */
@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private app: App | null = null;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly usersService: UsersService,
    private readonly notificationRecordService: NotificationRecordService,
  ) {}

  onModuleInit(): void {
    const path = this.appConfigService.firebase.serviceAccountPath;
    if (!path) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled',
      );
      return;
    }
    try {
      const serviceAccount = JSON.parse(
        readFileSync(path, 'utf8'),
      ) as ServiceAccount;
      this.app = initializeApp({ credential: cert(serviceAccount) });
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase from ${path} — push notifications disabled`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    const user = await this.usersService.findById(userId);

    const category = categoryForType(payload.data?.type);
    if (
      category &&
      !isCategoryEnabled(user.notificationPreferences, category)
    ) {
      // Muted category — no push, and deliberately no in-app record either:
      // the whole point of muting is not seeing it, not just not being
      // pushed about it.
      return;
    }

    // Always recorded for the in-app notification center, even when the
    // FCM send below no-ops (Firebase not configured, no device token) —
    // from the caller's perspective a notification-worthy event happened
    // regardless of whether a push actually reached a device.
    await this.notificationRecordService.record(userId, payload);

    if (!this.app || user.pushTokens.length === 0) return;

    const response = await getMessaging(this.app).sendEachForMulticast({
      tokens: user.pushTokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
    });

    const staleTokens = response.responses
      .map((result, index) =>
        !result.success &&
        (result.error?.code === 'messaging/invalid-registration-token' ||
          result.error?.code === 'messaging/registration-token-not-registered')
          ? user.pushTokens[index]
          : null,
      )
      .filter((token): token is string => token !== null);

    if (staleTokens.length > 0) {
      await this.usersService.removePushTokens(userId, staleTokens);
    }
  }
}
