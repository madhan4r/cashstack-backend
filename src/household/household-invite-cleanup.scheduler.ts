import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HouseholdInviteStatus } from './enums';
import { HouseholdInvite } from './schemas/household-invite.schema';

/**
 * Every read path (`getPendingInvitesForEmail`, `respondToInvite`,
 * `autoJoinPendingInvite`, the dedup check in `inviteMember`) already
 * ignores a PENDING invite once `expiresAt` has passed, so this sweep isn't
 * load-bearing for correctness — it just keeps `status` itself honest
 * instead of a stale invite sitting as "PENDING" forever in the collection.
 */
@Injectable()
export class HouseholdInviteCleanupScheduler {
  private readonly logger = new Logger(HouseholdInviteCleanupScheduler.name);

  constructor(
    @InjectModel(HouseholdInvite.name)
    private readonly inviteModel: Model<HouseholdInvite>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireStaleInvites(): Promise<void> {
    const result = await this.inviteModel
      .updateMany(
        {
          status: HouseholdInviteStatus.PENDING,
          expiresAt: { $lte: new Date() },
        },
        { $set: { status: HouseholdInviteStatus.EXPIRED } },
      )
      .exec();
    if (result.modifiedCount > 0) {
      this.logger.log(
        `Expired ${result.modifiedCount} stale household invite(s)`,
      );
    }
  }
}
