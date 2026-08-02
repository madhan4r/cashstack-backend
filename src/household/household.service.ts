import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HOUSEHOLD_MESSAGES } from '../common/constants';
import {
  AppException,
  ConflictActionException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { User, UserDocument } from '../users/schemas/user.schema';
import { HouseholdInviteResponseDto } from './dto/household-invite-response.dto';
import { HouseholdResponseDto } from './dto/household-response.dto';
import { HouseholdInviteStatus } from './enums';
import { Household, HouseholdDocument } from './schemas/household.schema';
import {
  HouseholdInvite,
  HouseholdInviteDocument,
} from './schemas/household-invite.schema';

/** How long a resolved accessible-ids set is trusted before re-querying —
 * long enough to collapse the several redundant lookups a single request
 * like GET /dashboard makes (transactions, balances, budget all resolve
 * scope independently), short enough that a just-accepted/left household
 * shows up practically immediately everywhere. */
const ACCESSIBLE_IDS_CACHE_TTL_MS = 5000;

@Injectable()
export class HouseholdService {
  private readonly accessibleIdsCache = new Map<
    string,
    { ids: string[]; expiresAt: number }
  >();

  constructor(
    @InjectModel(Household.name)
    private readonly householdModel: Model<Household>,
    @InjectModel(HouseholdInvite.name)
    private readonly inviteModel: Model<HouseholdInvite>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * The one method every other feature module depends on: the set of user
   * ids whose data the caller should see/edit — just themselves if they're
   * not in a household, otherwise every member of it (themselves included).
   *
   * Cached briefly (see [ACCESSIBLE_IDS_CACHE_TTL_MS]) since a single
   * request often calls this several times over — e.g. the Dashboard
   * resolves it independently for transactions, account balances, and
   * budget, all in parallel.
   */
  async getAccessibleUserIds(userId: string): Promise<string[]> {
    const cached = this.accessibleIdsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.ids;
    }

    const user = await this.userModel
      .findById(userId)
      .select('householdId')
      .exec();

    const ids = !user?.householdId
      ? [userId]
      : (
          await this.userModel
            .find({ householdId: user.householdId })
            .select('_id')
            .exec()
        ).map((member) => member._id.toString());

    const expiresAt = Date.now() + ACCESSIBLE_IDS_CACHE_TTL_MS;
    // Every member resolves to the same set, so seed the cache for all of
    // them, not just the caller — a household's members hitting the
    // Dashboard around the same time all benefit from one lookup.
    for (const id of ids) {
      this.accessibleIdsCache.set(id, { ids, expiresAt });
    }
    return ids;
  }

  /** Called after anything that changes who's in a household, so the next
   * call to [getAccessibleUserIds] re-queries instead of serving a stale
   * membership set for up to [ACCESSIBLE_IDS_CACHE_TTL_MS]. */
  private invalidateAccessibleIdsCache(userIds: string[]): void {
    for (const id of userIds) {
      this.accessibleIdsCache.delete(id);
    }
  }

  /** Same scope as [getAccessibleUserIds], but with names attached — used by
   * Accounts/Transactions to label items with "via {name}" when they aren't
   * the viewer's own. */
  async getAccessibleUserNames(userId: string): Promise<Map<string, string>> {
    const user = await this.userModel
      .findById(userId)
      .select('householdId fullName')
      .exec();
    if (!user) return new Map();
    if (!user.householdId) {
      return new Map([[user._id.toString(), user.fullName]]);
    }

    const members = await this.userModel
      .find({ householdId: user.householdId })
      .select('fullName')
      .exec();
    return new Map(members.map((m) => [m._id.toString(), m.fullName]));
  }

  async getMyHousehold(userId: string): Promise<HouseholdResponseDto | null> {
    const user = await this.userModel
      .findById(userId)
      .select('householdId')
      .exec();
    if (!user?.householdId) return null;

    const [household, members] = await Promise.all([
      this.householdModel.findById(user.householdId).exec(),
      this.userModel
        .find({ householdId: user.householdId })
        .select('fullName email')
        .exec(),
    ]);
    if (!household) return null;

    return this.toHouseholdResponse(household, members);
  }

  /** Auto-creates a household for the caller if they don't have one yet. */
  async inviteMember(
    userId: string,
    email: string,
  ): Promise<HouseholdInviteResponseDto> {
    const normalizedEmail = email.toLowerCase();
    const inviter = await this.userModel.findById(userId).exec();
    if (!inviter) {
      throw new ResourceNotFoundException(HOUSEHOLD_MESSAGES.INVITE_NOT_FOUND);
    }
    if (inviter.email === normalizedEmail) {
      throw new AppException(HOUSEHOLD_MESSAGES.CANNOT_INVITE_SELF);
    }

    let householdId = inviter.householdId;
    if (!householdId) {
      const household = await this.householdModel.create({
        name: `${inviter.fullName}'s Household`,
        createdBy: inviter._id,
      });
      householdId = household._id;
      await this.userModel
        .findByIdAndUpdate(inviter._id, { householdId })
        .exec();
      this.invalidateAccessibleIdsCache([inviter._id.toString()]);
    }

    const invitee = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();
    if (invitee?.householdId?.toString() === householdId.toString()) {
      throw new ConflictActionException(HOUSEHOLD_MESSAGES.ALREADY_A_MEMBER);
    }

    const existingPending = await this.inviteModel
      .findOne({
        householdId,
        invitedEmail: normalizedEmail,
        status: HouseholdInviteStatus.PENDING,
      })
      .exec();
    const invite =
      existingPending ??
      (await this.inviteModel.create({
        householdId,
        invitedEmail: normalizedEmail,
        invitedBy: inviter._id,
        status: HouseholdInviteStatus.PENDING,
      }));

    return this.toInviteResponse(
      invite,
      await this.householdName(householdId),
      inviter,
    );
  }

  async getPendingInvitesForEmail(
    email: string,
  ): Promise<HouseholdInviteResponseDto[]> {
    const invites = await this.inviteModel
      .find({
        invitedEmail: email.toLowerCase(),
        status: HouseholdInviteStatus.PENDING,
      })
      .sort({ createdAt: -1 })
      .exec();
    if (invites.length === 0) return [];

    const householdIds = [
      ...new Set(invites.map((i) => i.householdId.toString())),
    ];
    const inviterIds = [...new Set(invites.map((i) => i.invitedBy.toString()))];
    const [households, inviters] = await Promise.all([
      this.householdModel.find({ _id: { $in: householdIds } }).exec(),
      this.userModel.find({ _id: { $in: inviterIds } }).exec(),
    ]);
    const householdById = new Map(households.map((h) => [h._id.toString(), h]));
    const inviterById = new Map(inviters.map((u) => [u._id.toString(), u]));

    return invites.map((invite) =>
      this.toInviteResponse(
        invite,
        householdById.get(invite.householdId.toString())?.name ?? 'Household',
        inviterById.get(invite.invitedBy.toString()) ?? null,
      ),
    );
  }

  async respondToInvite(
    userId: string,
    inviteId: string,
    accept: boolean,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ResourceNotFoundException(HOUSEHOLD_MESSAGES.INVITE_NOT_FOUND);
    }

    const invite = await this.inviteModel
      .findOne({
        _id: inviteId,
        invitedEmail: user.email,
        status: HouseholdInviteStatus.PENDING,
      })
      .exec();
    if (!invite) {
      throw new ResourceNotFoundException(HOUSEHOLD_MESSAGES.INVITE_NOT_FOUND);
    }

    if (!accept) {
      invite.status = HouseholdInviteStatus.DECLINED;
      invite.respondedAt = new Date();
      await invite.save();
      return;
    }

    if (
      user.householdId &&
      user.householdId.toString() !== invite.householdId.toString()
    ) {
      throw new ConflictActionException(
        HOUSEHOLD_MESSAGES.ALREADY_IN_ANOTHER_HOUSEHOLD,
      );
    }

    invite.status = HouseholdInviteStatus.ACCEPTED;
    invite.respondedAt = new Date();
    await invite.save();
    await this.userModel
      .findByIdAndUpdate(userId, { householdId: invite.householdId })
      .exec();
    this.invalidateAccessibleIdsCache([userId]);
  }

  async cancelInvite(userId: string, inviteId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    const invite = await this.inviteModel
      .findOne({ _id: inviteId, status: HouseholdInviteStatus.PENDING })
      .exec();

    if (
      !invite ||
      !user?.householdId ||
      invite.householdId.toString() !== user.householdId.toString()
    ) {
      throw new ResourceNotFoundException(HOUSEHOLD_MESSAGES.INVITE_NOT_FOUND);
    }

    invite.status = HouseholdInviteStatus.CANCELLED;
    invite.respondedAt = new Date();
    await invite.save();
  }

  async leaveHousehold(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user?.householdId) return;

    const householdId = user.householdId;
    await this.userModel
      .findByIdAndUpdate(userId, { householdId: null })
      .exec();
    this.invalidateAccessibleIdsCache([userId]);

    const remainingMembers = await this.userModel
      .countDocuments({ householdId })
      .exec();
    if (remainingMembers === 0) {
      await this.householdModel.findByIdAndDelete(householdId).exec();
    }
  }

  /**
   * Joins the newest pending invite for this email, if any — called right
   * after registration so someone invited before they had an account ends
   * up in the household the moment they sign up, matching the "sign up,
   * then it auto-links" flow (there's no email delivery to prompt them
   * otherwise, see AuthService.register).
   */
  async autoJoinPendingInvite(newUser: UserDocument): Promise<void> {
    const invite = await this.inviteModel
      .findOne({
        invitedEmail: newUser.email,
        status: HouseholdInviteStatus.PENDING,
      })
      .sort({ createdAt: 1 })
      .exec();
    if (!invite) return;

    invite.status = HouseholdInviteStatus.ACCEPTED;
    invite.respondedAt = new Date();
    await invite.save();
    await this.userModel
      .findByIdAndUpdate(newUser._id, { householdId: invite.householdId })
      .exec();
    this.invalidateAccessibleIdsCache([newUser._id.toString()]);
  }

  private async householdName(
    householdId: HouseholdDocument['_id'],
  ): Promise<string> {
    const household = await this.householdModel.findById(householdId).exec();
    return household?.name ?? 'Household';
  }

  private toHouseholdResponse(
    household: HouseholdDocument,
    members: UserDocument[],
  ): HouseholdResponseDto {
    return {
      id: household._id.toString(),
      name: household.name,
      members: members.map((member) => ({
        id: member._id.toString(),
        fullName: member.fullName,
        email: member.email,
      })),
    };
  }

  private toInviteResponse(
    invite: HouseholdInviteDocument,
    householdName: string,
    invitedBy: UserDocument | null,
  ): HouseholdInviteResponseDto {
    return {
      id: invite._id.toString(),
      householdId: invite.householdId.toString(),
      householdName,
      invitedEmail: invite.invitedEmail,
      invitedByName: invitedBy?.fullName ?? 'A household member',
      status: invite.status,
      createdAt: (invite as unknown as { createdAt: Date }).createdAt,
    };
  }
}
