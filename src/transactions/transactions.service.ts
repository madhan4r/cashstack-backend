import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { AppException, ResourceNotFoundException } from '../common/exceptions';
import { TRANSACTION_MESSAGES } from '../common/constants';
import { HouseholdService } from '../household/household.service';
import { TransactionSort, TransactionType } from './enums';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { PaginatedResult, SanitizedTransaction } from './interfaces';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

interface ResolvedTransactionFields {
  accountId: Types.ObjectId | null;
  categoryId: Types.ObjectId | null;
  fromAccountId: Types.ObjectId | null;
  toAccountId: Types.ObjectId | null;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly householdService: HouseholdService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionDocument> {
    const resolvedFields = await this.resolveAndValidateFields(
      userId,
      dto.type,
      dto,
    );

    return this.transactionModel.create({
      userId,
      amount: dto.amount,
      type: dto.type,
      notes: dto.notes ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      transactionDate: new Date(dto.transactionDate),
      tags: dto.tags ?? [],
      ...resolvedFields,
    });
  }

  async findAll(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<PaginatedResult<TransactionDocument>> {
    const match = await this.buildMatchStage(userId, query);
    const sortStage = this.buildSortStage(query.sort);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $facet: {
          data: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.transactionModel.aggregate<{
      data: TransactionDocument[];
      totalCount: { count: number }[];
    }>(pipeline);

    const total = result?.totalCount[0]?.count ?? 0;

    return {
      items: result?.data ?? [],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDocument> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const transaction = await this.transactionModel
      .findOne({ _id: transactionId, userId: { $in: scopeIds } })
      .exec();

    if (!transaction) {
      throw new ResourceNotFoundException(TRANSACTION_MESSAGES.NOT_FOUND);
    }

    return transaction;
  }

  async update(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionDocument> {
    const transaction = await this.findOne(userId, transactionId);
    const effectiveType = dto.type ?? transaction.type;

    const resolvedFields = await this.resolveAndValidateFields(
      userId,
      effectiveType,
      {
        accountId: dto.accountId ?? transaction.accountId?.toString(),
        categoryId: dto.categoryId ?? transaction.categoryId?.toString(),
        fromAccountId:
          dto.fromAccountId ?? transaction.fromAccountId?.toString(),
        toAccountId: dto.toAccountId ?? transaction.toAccountId?.toString(),
      },
    );

    transaction.set({
      amount: dto.amount ?? transaction.amount,
      type: effectiveType,
      notes: dto.notes ?? transaction.notes,
      paymentMethod: dto.paymentMethod ?? transaction.paymentMethod,
      transactionDate: dto.transactionDate
        ? new Date(dto.transactionDate)
        : transaction.transactionDate,
      tags: dto.tags ?? transaction.tags,
      ...resolvedFields,
    });

    return transaction.save();
  }

  async remove(userId: string, transactionId: string): Promise<void> {
    const transaction = await this.findOne(userId, transactionId);
    await transaction.deleteOne();
  }

  toSanitized(
    transaction: TransactionDocument,
    ownerName: string = '',
  ): SanitizedTransaction {
    return {
      id: transaction._id.toString(),
      amount: transaction.amount,
      type: transaction.type,
      accountId: transaction.accountId?.toString() ?? null,
      categoryId: transaction.categoryId?.toString() ?? null,
      fromAccountId: transaction.fromAccountId?.toString() ?? null,
      toAccountId: transaction.toAccountId?.toString() ?? null,
      notes: transaction.notes,
      paymentMethod: transaction.paymentMethod,
      transactionDate: transaction.transactionDate,
      tags: transaction.tags,
      ownerId: transaction.userId.toString(),
      ownerName,
      createdAt: (transaction as unknown as { createdAt: Date }).createdAt,
      updatedAt: (transaction as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  private async resolveAndValidateFields(
    userId: string,
    type: TransactionType,
    fields: {
      accountId?: string;
      categoryId?: string;
      fromAccountId?: string;
      toAccountId?: string;
    },
  ): Promise<ResolvedTransactionFields> {
    if (type === TransactionType.TRANSFER) {
      if (!fields.fromAccountId || !fields.toAccountId) {
        throw new AppException(TRANSACTION_MESSAGES.TRANSFER_ACCOUNTS_REQUIRED);
      }

      if (fields.fromAccountId === fields.toAccountId) {
        throw new AppException(
          TRANSACTION_MESSAGES.INVALID_TRANSFER_SAME_ACCOUNT,
        );
      }

      await Promise.all([
        this.assertAccountOwnership(userId, fields.fromAccountId),
        this.assertAccountOwnership(userId, fields.toAccountId),
      ]);

      return {
        accountId: null,
        categoryId: null,
        fromAccountId: new Types.ObjectId(fields.fromAccountId),
        toAccountId: new Types.ObjectId(fields.toAccountId),
      };
    }

    if (!fields.accountId || !fields.categoryId) {
      throw new AppException(TRANSACTION_MESSAGES.ACCOUNT_CATEGORY_REQUIRED);
    }

    await this.assertAccountOwnership(userId, fields.accountId);
    const category = await this.categoriesService.findOne(
      userId,
      fields.categoryId,
    );

    if (category.type.toString() !== type.toString()) {
      throw new AppException(TRANSACTION_MESSAGES.CATEGORY_TYPE_MISMATCH);
    }

    return {
      accountId: new Types.ObjectId(fields.accountId),
      categoryId: new Types.ObjectId(fields.categoryId),
      fromAccountId: null,
      toAccountId: null,
    };
  }

  private async assertAccountOwnership(
    userId: string,
    accountId: string,
  ): Promise<void> {
    await this.accountsService.findOne(userId, accountId).catch(() => {
      throw new ResourceNotFoundException(
        TRANSACTION_MESSAGES.ACCOUNT_NOT_FOUND,
      );
    });
  }

  private async buildMatchStage(
    userId: string,
    query: QueryTransactionsDto,
  ): Promise<Record<string, unknown>> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const match: Record<string, unknown> = {
      userId: { $in: scopeIds.map((id) => new Types.ObjectId(id)) },
    };

    if (query.fromDate || query.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.fromDate) {
        const start = new Date(query.fromDate);
        start.setUTCHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setUTCHours(0, 0, 0, 0);
        end.setUTCDate(end.getUTCDate() + 1);
        dateFilter.$lt = end;
      }
      match.transactionDate = dateFilter;
    } else if (query.date) {
      const start = new Date(query.date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      match.transactionDate = { $gte: start, $lt: end };
    } else if (query.year && query.month) {
      const start = new Date(Date.UTC(query.year, query.month - 1, 1));
      const end = new Date(Date.UTC(query.year, query.month, 1));
      match.transactionDate = { $gte: start, $lt: end };
    } else if (query.year) {
      const start = new Date(Date.UTC(query.year, 0, 1));
      const end = new Date(Date.UTC(query.year + 1, 0, 1));
      match.transactionDate = { $gte: start, $lt: end };
    } else if (query.month) {
      match.$expr = { $eq: [{ $month: '$transactionDate' }, query.month] };
    }

    if (query.category) {
      match.categoryId = new Types.ObjectId(query.category);
    }

    if (query.account) {
      const accountObjectId = new Types.ObjectId(query.account);
      match.$or = [
        { accountId: accountObjectId },
        { fromAccountId: accountObjectId },
        { toAccountId: accountObjectId },
      ];
    }

    if (query.type) {
      match.type = query.type;
    }

    if (query.minAmount !== undefined || query.maxAmount !== undefined) {
      const amountFilter: Record<string, number> = {};
      if (query.minAmount !== undefined) {
        amountFilter.$gte = query.minAmount;
      }
      if (query.maxAmount !== undefined) {
        amountFilter.$lte = query.maxAmount;
      }
      match.amount = amountFilter;
    }

    if (query.search) {
      const searchRegex = new RegExp(this.escapeRegex(query.search), 'i');
      const searchConditions: Record<string, unknown>[] = [
        { notes: searchRegex },
        { tags: searchRegex },
      ];

      const numericSearch = Number(query.search);
      if (!Number.isNaN(numericSearch)) {
        searchConditions.push({ amount: numericSearch });
      }

      match.$and = [{ $or: searchConditions }];
    }

    return match;
  }

  private buildSortStage(sort?: TransactionSort): Record<string, 1 | -1> {
    switch (sort) {
      case TransactionSort.OLDEST:
        return { transactionDate: 1 };
      case TransactionSort.AMOUNT:
        return { amount: -1 };
      case TransactionSort.AMOUNT_ASC:
        return { amount: 1 };
      case TransactionSort.NEWEST:
      default:
        return { transactionDate: -1 };
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
