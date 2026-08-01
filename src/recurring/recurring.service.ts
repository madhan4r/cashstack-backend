import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/enums';
import { AppException, ResourceNotFoundException } from '../common/exceptions';
import { RECURRING_MESSAGES } from '../common/constants';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { QueryRecurringDto } from './dto/query-recurring.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import {
  OccurrenceStatus,
  RecurrenceFrequency,
  RecurringSort,
  RecurringStatus,
} from './enums';
import { SanitizedRecurring } from './interfaces';
import {
  RecurringOccurrence,
  RecurringOccurrenceDocument,
} from './schemas/recurring-occurrence.schema';
import {
  RecurringTransaction,
  RecurringTransactionDocument,
} from './schemas/recurring-transaction.schema';
import { UpcomingOccurrenceDto } from './dto/upcoming-occurrence.dto';
import { OccurrenceResponseDto } from './dto/occurrence-response.dto';

/** Safety cap on how many periods a single catch-up pass will process for
 * one schedule — prevents a runaway loop for a long-forgotten daily
 * schedule from blocking a request or generating hundreds of backdated
 * transactions in one go. */
const MAX_CATCHUP_ITERATIONS = 24;
/** Safety cap on how many future periods `getUpcoming` will project per
 * schedule — a daily schedule with a huge preview window could otherwise
 * generate an unbounded number of projected rows. */
const MAX_PREVIEW_ITERATIONS = 60;

@Injectable()
export class RecurringService {
  constructor(
    @InjectModel(RecurringTransaction.name)
    private readonly recurringModel: Model<RecurringTransaction>,
    @InjectModel(RecurringOccurrence.name)
    private readonly occurrenceModel: Model<RecurringOccurrence>,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(
    userId: string,
    dto: CreateRecurringDto,
  ): Promise<RecurringTransactionDocument> {
    if (dto.type === TransactionType.TRANSFER) {
      throw new AppException(RECURRING_MESSAGES.TRANSFER_NOT_SUPPORTED);
    }

    await this.assertAccountAndCategory(
      userId,
      dto.type,
      dto.accountId,
      dto.categoryId,
    );

    const doc = await this.recurringModel.create({
      userId,
      name: dto.name,
      type: dto.type,
      amount: dto.amount,
      categoryId: dto.categoryId,
      accountId: dto.accountId,
      notes: dto.notes ?? null,
      frequency: dto.frequency,
      customIntervalDays: dto.customIntervalDays ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      reminder: dto.reminder ?? undefined,
      autoGenerate: dto.autoGenerate ?? true,
      nextDueDate: new Date(dto.startDate),
    });

    await this.catchUp(doc);
    return doc;
  }

  async findAll(
    userId: string,
    query: QueryRecurringDto,
  ): Promise<RecurringTransactionDocument[]> {
    await this.catchUpAllActive(userId);

    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.status) match.status = query.status;
    if (query.frequency) match.frequency = query.frequency;

    return this.recurringModel
      .find(match)
      .sort(this.sortStage(query.sort))
      .exec();
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<RecurringTransactionDocument> {
    const doc = await this.recurringModel.findOne({ _id: id, userId }).exec();
    if (!doc) {
      throw new ResourceNotFoundException(RECURRING_MESSAGES.NOT_FOUND);
    }
    if (doc.status === RecurringStatus.ACTIVE) {
      await this.catchUp(doc);
    }
    return doc;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringTransactionDocument> {
    const doc = await this.findOne(userId, id);
    const effectiveType = dto.type ?? doc.type;

    if (effectiveType === TransactionType.TRANSFER) {
      throw new AppException(RECURRING_MESSAGES.TRANSFER_NOT_SUPPORTED);
    }

    if (dto.accountId || dto.categoryId || dto.type) {
      await this.assertAccountAndCategory(
        userId,
        effectiveType,
        dto.accountId ?? doc.accountId.toString(),
        dto.categoryId ?? doc.categoryId.toString(),
      );
    }

    doc.set({
      name: dto.name ?? doc.name,
      type: effectiveType,
      amount: dto.amount ?? doc.amount,
      categoryId: dto.categoryId ?? doc.categoryId,
      accountId: dto.accountId ?? doc.accountId,
      notes: dto.notes !== undefined ? (dto.notes ?? null) : doc.notes,
      frequency: dto.frequency ?? doc.frequency,
      customIntervalDays:
        dto.customIntervalDays !== undefined
          ? dto.customIntervalDays
          : doc.customIntervalDays,
      endDate:
        dto.endDate !== undefined
          ? dto.endDate
            ? new Date(dto.endDate)
            : null
          : doc.endDate,
      reminder: dto.reminder ?? doc.reminder,
      autoGenerate: dto.autoGenerate ?? doc.autoGenerate,
    });

    // A new startDate resets the schedule from scratch — anything else
    // (frequency, amount, ...) only affects future occurrences from the
    // current `nextDueDate` onward, so past history stays intact.
    if (dto.startDate) {
      doc.startDate = new Date(dto.startDate);
      doc.nextDueDate = new Date(dto.startDate);
    }

    await doc.save();
    if (doc.status === RecurringStatus.ACTIVE) {
      await this.catchUp(doc);
    }
    return doc;
  }

  async remove(userId: string, id: string): Promise<void> {
    const doc = await this.findOne(userId, id);
    await Promise.all([
      doc.deleteOne(),
      this.occurrenceModel
        .deleteMany({ recurringTransactionId: doc._id })
        .exec(),
    ]);
  }

  async pause(
    userId: string,
    id: string,
  ): Promise<RecurringTransactionDocument> {
    const doc = await this.findOne(userId, id);
    if (doc.status === RecurringStatus.COMPLETED) {
      throw new AppException(RECURRING_MESSAGES.COMPLETED_CANNOT_CHANGE_STATUS);
    }
    if (doc.status === RecurringStatus.PAUSED) {
      throw new AppException(RECURRING_MESSAGES.ALREADY_PAUSED);
    }
    doc.status = RecurringStatus.PAUSED;
    return doc.save();
  }

  async resume(
    userId: string,
    id: string,
  ): Promise<RecurringTransactionDocument> {
    const doc = await this.findOne(userId, id);
    if (doc.status === RecurringStatus.COMPLETED) {
      throw new AppException(RECURRING_MESSAGES.COMPLETED_CANNOT_CHANGE_STATUS);
    }
    if (doc.status === RecurringStatus.ACTIVE) {
      throw new AppException(RECURRING_MESSAGES.ALREADY_ACTIVE);
    }
    doc.status = RecurringStatus.ACTIVE;
    await doc.save();
    await this.catchUp(doc);
    return doc;
  }

  async getUpcoming(
    userId: string,
    days: number,
  ): Promise<UpcomingOccurrenceDto[]> {
    await this.catchUpAllActive(userId);

    const docs = await this.recurringModel
      .find({
        userId: new Types.ObjectId(userId),
        status: RecurringStatus.ACTIVE,
      })
      .exec();

    const windowEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const results: UpcomingOccurrenceDto[] = [];

    for (const doc of docs) {
      let due = doc.nextDueDate;
      let iterations = 0;
      while (due <= windowEnd && iterations < MAX_PREVIEW_ITERATIONS) {
        if (doc.endDate && due > doc.endDate) break;
        results.push({
          recurringTransactionId: doc._id.toString(),
          name: doc.name,
          type: doc.type,
          amount: doc.amount,
          categoryId: doc.categoryId.toString(),
          accountId: doc.accountId.toString(),
          dueDate: due,
        });
        due = this.computeNextDueDate(
          due,
          doc.frequency,
          doc.customIntervalDays,
        );
        iterations++;
      }
    }

    results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return results;
  }

  async getHistory(
    userId: string,
    query: QueryHistoryDto,
  ): Promise<{
    items: OccurrenceResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.catchUpAllActive(userId);

    const match: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (query.status) match.status = query.status;
    if (query.recurringTransactionId) {
      match.recurringTransactionId = new Types.ObjectId(
        query.recurringTransactionId,
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { dueDate: -1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: 'recurringtransactions',
                localField: 'recurringTransactionId',
                foreignField: '_id',
                as: 'recurring',
              },
            },
            { $unwind: '$recurring' },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.occurrenceModel.aggregate<{
      data: (RecurringOccurrenceDocument & {
        recurring: RecurringTransactionDocument;
      })[];
      totalCount: { count: number }[];
    }>(pipeline);

    const total = result?.totalCount[0]?.count ?? 0;
    const items = (result?.data ?? []).map((row) => ({
      id: row._id.toString(),
      recurringTransactionId: row.recurringTransactionId.toString(),
      name: row.recurring.name,
      amount: row.recurring.amount,
      dueDate: row.dueDate,
      status: row.status,
      transactionId: row.transactionId ? row.transactionId.toString() : null,
    }));

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  toSanitized(doc: RecurringTransactionDocument): SanitizedRecurring {
    return {
      id: doc._id.toString(),
      name: doc.name,
      type: doc.type,
      amount: doc.amount,
      categoryId: doc.categoryId.toString(),
      accountId: doc.accountId.toString(),
      notes: doc.notes,
      frequency: doc.frequency,
      customIntervalDays: doc.customIntervalDays,
      startDate: doc.startDate,
      endDate: doc.endDate,
      reminder: doc.reminder,
      autoGenerate: doc.autoGenerate,
      status: doc.status,
      nextDueDate: doc.nextDueDate,
      lastGeneratedDate: doc.lastGeneratedDate,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  /**
   * Processes every due-but-unprocessed period for a single schedule:
   * auto-generates the real transaction (when `autoGenerate`) or logs a
   * MISSED occurrence, then advances `nextDueDate`. Marks the schedule
   * COMPLETED once it advances past `endDate`. No-op for non-ACTIVE
   * schedules or schedules that aren't due yet.
   */
  private async catchUp(doc: RecurringTransactionDocument): Promise<void> {
    if (doc.status !== RecurringStatus.ACTIVE) return;

    const now = new Date();
    let iterations = 0;
    let mutated = false;

    while (doc.nextDueDate <= now && iterations < MAX_CATCHUP_ITERATIONS) {
      mutated = true;

      if (doc.autoGenerate) {
        const transaction = await this.transactionsService.create(
          doc.userId.toString(),
          {
            amount: doc.amount,
            type: doc.type,
            accountId: doc.accountId.toString(),
            categoryId: doc.categoryId.toString(),
            notes: doc.notes ?? doc.name,
            transactionDate: doc.nextDueDate.toISOString(),
          },
        );
        await this.occurrenceModel.create({
          recurringTransactionId: doc._id,
          userId: doc.userId,
          dueDate: doc.nextDueDate,
          status: OccurrenceStatus.GENERATED,
          transactionId: transaction._id,
        });
        doc.lastGeneratedDate = doc.nextDueDate;
      } else {
        await this.occurrenceModel.create({
          recurringTransactionId: doc._id,
          userId: doc.userId,
          dueDate: doc.nextDueDate,
          status: OccurrenceStatus.MISSED,
        });
      }

      const next = this.computeNextDueDate(
        doc.nextDueDate,
        doc.frequency,
        doc.customIntervalDays,
      );
      doc.nextDueDate = next;
      iterations++;

      if (doc.endDate && next > doc.endDate) {
        doc.status = RecurringStatus.COMPLETED;
        break;
      }
    }

    if (mutated) {
      await doc.save();
    }
  }

  private async catchUpAllActive(userId: string): Promise<void> {
    const activeDocs = await this.recurringModel
      .find({
        userId: new Types.ObjectId(userId),
        status: RecurringStatus.ACTIVE,
      })
      .exec();
    await Promise.all(activeDocs.map((doc) => this.catchUp(doc)));
  }

  private computeNextDueDate(
    date: Date,
    frequency: RecurrenceFrequency,
    customIntervalDays: number | null,
  ): Date {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return this.addDays(date, 1);
      case RecurrenceFrequency.WEEKLY:
        return this.addDays(date, 7);
      case RecurrenceFrequency.MONTHLY:
        return this.addMonths(date, 1);
      case RecurrenceFrequency.QUARTERLY:
        return this.addMonths(date, 3);
      case RecurrenceFrequency.HALF_YEARLY:
        return this.addMonths(date, 6);
      case RecurrenceFrequency.YEARLY:
        return this.addMonths(date, 12);
      case RecurrenceFrequency.CUSTOM:
        return this.addDays(date, customIntervalDays ?? 1);
    }
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private addMonths(date: Date, months: number): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + months,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
      ),
    );
  }

  private sortStage(sort?: RecurringSort): Record<string, 1 | -1> {
    switch (sort) {
      case RecurringSort.AMOUNT:
        return { amount: -1 };
      case RecurringSort.RECENT:
        return { createdAt: -1 };
      case RecurringSort.NEXT_DUE:
      default:
        return { nextDueDate: 1 };
    }
  }

  private async assertAccountAndCategory(
    userId: string,
    type: TransactionType,
    accountId: string,
    categoryId: string,
  ): Promise<void> {
    await this.accountsService.findOne(userId, accountId);
    const category = await this.categoriesService.findOne(userId, categoryId);
    if (category.type.toString() !== type.toString()) {
      throw new AppException(RECURRING_MESSAGES.CATEGORY_TYPE_MISMATCH);
    }
  }
}
