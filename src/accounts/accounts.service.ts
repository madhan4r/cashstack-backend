import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ACCOUNT_MESSAGES } from '../common/constants';
import {
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { HouseholdService } from '../household/household.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { SanitizedAccount } from './interfaces';
import { Account, AccountDocument } from './schemas/account.schema';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly householdService: HouseholdService,
  ) {}

  async create(
    userId: string,
    dto: CreateAccountDto,
  ): Promise<AccountDocument> {
    // Uniqueness stays scoped to the creator, not the whole household — the
    // underlying schema index is per-`userId`, since accounts stay
    // individually owned even once shared (see HouseholdService's doc).
    await this.ensureNameIsUnique(userId, dto.name);

    try {
      return await this.accountModel.create({ ...dto, userId });
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  async findAll(userId: string): Promise<AccountDocument[]> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    return this.accountModel
      .find({ userId: { $in: scopeIds }, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Exactly one member's own accounts, ignoring the caller's own combine/
   * separate view mode entirely — used by the "view a member's data"
   * read-only peek (`GET /accounts/member/:memberId`), which has already
   * separately verified the caller shares a household with `memberId` via
   * `HouseholdService.assertSharesHousehold`. */
  async findAllForUser(memberId: string): Promise<AccountDocument[]> {
    return this.accountModel
      .find({ userId: memberId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, accountId: string): Promise<AccountDocument> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const account = await this.accountModel
      .findOne({ _id: accountId, userId: { $in: scopeIds }, isDeleted: false })
      .exec();

    if (!account) {
      throw new ResourceNotFoundException(ACCOUNT_MESSAGES.NOT_FOUND);
    }

    return account;
  }

  async update(
    userId: string,
    accountId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountDocument> {
    const account = await this.findOne(userId, accountId);

    if (dto.name && dto.name !== account.name) {
      await this.ensureNameIsUnique(userId, dto.name);
    }

    account.set(dto);

    try {
      return await account.save();
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  async remove(userId: string, accountId: string): Promise<void> {
    const account = await this.findOne(userId, accountId);
    account.isDeleted = true;
    account.deletedAt = new Date();
    await account.save();
  }

  async archive(userId: string, accountId: string): Promise<AccountDocument> {
    const account = await this.findOne(userId, accountId);
    account.isArchived = true;
    return account.save();
  }

  async unarchive(userId: string, accountId: string): Promise<AccountDocument> {
    const account = await this.findOne(userId, accountId);
    account.isArchived = false;
    return account.save();
  }

  toSanitized(
    account: AccountDocument,
    ownerName: string = '',
  ): SanitizedAccount {
    return {
      id: account._id.toString(),
      name: account.name,
      type: account.type,
      openingBalance: account.openingBalance,
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      description: account.description,
      isArchived: account.isArchived,
      ownerId: account.userId.toString(),
      ownerName,
      createdAt: (account as unknown as { createdAt: Date }).createdAt,
      updatedAt: (account as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  private async ensureNameIsUnique(
    userId: string,
    name: string,
  ): Promise<void> {
    const existing = await this.accountModel
      .findOne({ userId, name, isDeleted: false })
      .collation({ locale: 'en', strength: 2 })
      .exec();

    if (existing) {
      throw new ResourceAlreadyExistsException(ACCOUNT_MESSAGES.DUPLICATE_NAME);
    }
  }

  private translateDuplicateKeyError(error: unknown): unknown {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR_CODE
    ) {
      return new ResourceAlreadyExistsException(
        ACCOUNT_MESSAGES.DUPLICATE_NAME,
      );
    }
    return error;
  }
}
