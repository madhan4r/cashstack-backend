import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { promises as fs } from 'fs';
import { join } from 'path';
import { User } from '../schemas/user.schema';
import { AvatarService } from './avatar.service';

/**
 * Belt-and-suspenders sweep for `<uploadsDir>/avatars` files no user
 * document references any more — the normal replace/remove flow already
 * deletes the old file (see `AvatarService.delete`), so this only ever
 * catches leftovers from a crash between save-new and delete-old, or a
 * user whose account was removed by some other path entirely.
 */
@Injectable()
export class AvatarCleanupScheduler {
  private readonly logger = new Logger(AvatarCleanupScheduler.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly avatarService: AvatarService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async removeOrphanedAvatars(): Promise<void> {
    const dir = this.avatarService.avatarsDir;

    let files: string[];
    try {
      files = await fs.readdir(dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      this.logger.error(
        `Failed to list ${dir}`,
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }
    if (files.length === 0) return;

    const referenced = new Set(
      (
        await this.userModel
          .find({ avatarUrl: { $ne: null } })
          .select('avatarUrl')
          .exec()
      ).map((u) => (u.avatarUrl as string).split('/').pop()),
    );

    const orphans = files.filter((file) => !referenced.has(file));
    await Promise.all(
      orphans.map((file) =>
        fs.unlink(join(dir, file)).catch((error) => {
          this.logger.error(
            `Failed to delete orphaned avatar ${file}`,
            error instanceof Error ? error.stack : undefined,
          );
        }),
      ),
    );

    if (orphans.length > 0) {
      this.logger.log(`Removed ${orphans.length} orphaned avatar file(s)`);
    }
  }
}
