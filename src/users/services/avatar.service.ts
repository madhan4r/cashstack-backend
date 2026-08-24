import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { AppConfigService } from '../../config/app-config.service';

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Reads/writes avatar image files directly on disk — the server runs on a
 * single Linux box under pm2 (not behind object storage), so this is the
 * simplest thing that works. Files live under `<uploadsDir>/avatars`,
 * deliberately outside `dist/` (wiped every `nest build`) so they survive a
 * redeploy — see `AppConfig.uploadsDir`.
 */
@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  constructor(private readonly appConfigService: AppConfigService) {}

  get avatarsDir(): string {
    return join(this.appConfigService.app.uploadsDir, 'avatars');
  }

  /** Writes the file to disk and returns its relative URL (e.g.
   * `/uploads/avatars/<file>`) — not an absolute URL, see the schema field
   * doc. Does not touch any previously-stored avatar; call [delete]
   * separately once the new URL has been persisted on the user. */
  async save(userId: string, file: Express.Multer.File): Promise<string> {
    await fs.mkdir(this.avatarsDir, { recursive: true });

    const extension = EXTENSION_BY_MIME_TYPE[file.mimetype] ?? '.jpg';
    // Timestamp suffix so a browser/client image cache never serves a
    // stale picture after re-upload under what would otherwise be the same
    // filename.
    const filename = `${userId}-${Date.now()}${extension}`;
    await fs.writeFile(join(this.avatarsDir, filename), file.buffer);

    return `/uploads/avatars/${filename}`;
  }

  /** Best-effort delete — a missing file (already removed, or never
   * existed) is not an error, but anything else (permissions, disk I/O) is
   * logged rather than silently swallowed. */
  async delete(avatarUrl: string | null | undefined): Promise<void> {
    if (!avatarUrl) return;
    try {
      await fs.unlink(join(this.avatarsDir, basename(avatarUrl)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      this.logger.error(
        `Failed to delete avatar file for ${avatarUrl}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
