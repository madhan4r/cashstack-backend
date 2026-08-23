import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [UsersModule],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class NotificationsModule {}
