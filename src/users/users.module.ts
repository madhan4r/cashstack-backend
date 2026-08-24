import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { AvatarCleanupScheduler } from './services/avatar-cleanup.scheduler';
import { AvatarService } from './services/avatar.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, AvatarService, AvatarCleanupScheduler],
  exports: [UsersService],
})
export class UsersModule {}
