import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CATEGORY_MESSAGES } from '../common/constants';
import {
  ConflictActionException,
  ForbiddenActionException,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { HouseholdService } from '../household/household.service';
import { DEFAULT_CATEGORIES } from './constants';
import { CategoryType } from './enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryStats, SanitizedCategory } from './interfaces';
import { CategoryStatsService } from './services/category-stats.service';
import { Category, CategoryDocument } from './schemas/category.schema';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    private readonly categoryStatsService: CategoryStatsService,
    private readonly householdService: HouseholdService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultCategories();
  }

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    await this.ensureNameIsUnique(userId, dto.name, dto.type);

    try {
      return await this.categoryModel.create({
        ...dto,
        userId,
        isDefault: false,
      });
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  async findAll(userId: string): Promise<CategoryDocument[]> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    return this.categoryModel
      .find({ $or: [{ userId: { $in: scopeIds } }, { isDefault: true }] })
      .sort({ type: 1, name: 1 })
      .exec();
  }

  async findOne(userId: string, categoryId: string): Promise<CategoryDocument> {
    const scopeIds = await this.householdService.getAccessibleUserIds(userId);
    const category = await this.categoryModel
      .findOne({
        _id: categoryId,
        $or: [{ userId: { $in: scopeIds } }, { isDefault: true }],
      })
      .exec();

    if (!category) {
      throw new ResourceNotFoundException(CATEGORY_MESSAGES.NOT_FOUND);
    }

    return category;
  }

  async update(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    const category = await this.findOwnedCustomCategory(userId, categoryId);

    const nextName = dto.name ?? category.name;
    const nextType = dto.type ?? category.type;
    if (nextName !== category.name || nextType !== category.type) {
      await this.ensureNameIsUnique(userId, nextName, nextType, categoryId);
    }

    category.set(dto);

    try {
      return await category.save();
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  async remove(userId: string, categoryId: string): Promise<void> {
    const category = await this.findOwnedCustomCategory(
      userId,
      categoryId,
      CATEGORY_MESSAGES.DEFAULT_CANNOT_BE_DELETED,
    );

    const stats = await this.categoryStatsService.getStatsForCategory(
      userId,
      categoryId,
    );
    if (stats.transactionCount > 0) {
      throw new ConflictActionException(CATEGORY_MESSAGES.HAS_TRANSACTIONS);
    }

    await category.deleteOne();
  }

  /**
   * Archiving/restoring is a visibility toggle, not a content edit — unlike
   * [update] and [remove], it's allowed on default categories too, so users
   * can hide default categories they don't use without needing to "own"
   * them.
   */
  async archive(userId: string, categoryId: string): Promise<CategoryDocument> {
    const category = await this.findOne(userId, categoryId);
    category.isArchived = true;
    return category.save();
  }

  async unarchive(
    userId: string,
    categoryId: string,
  ): Promise<CategoryDocument> {
    const category = await this.findOne(userId, categoryId);
    category.isArchived = false;
    return category.save();
  }

  toSanitized(
    category: CategoryDocument,
    stats?: CategoryStats,
  ): SanitizedCategory {
    return {
      id: category._id.toString(),
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      description: category.description,
      isDefault: category.isDefault,
      isArchived: category.isArchived,
      transactionCount: stats?.transactionCount ?? 0,
      totalAmount: stats?.totalAmount ?? 0,
      lastUsedAt: stats?.lastUsedAt ?? null,
      createdAt: (category as unknown as { createdAt: Date }).createdAt,
      updatedAt: (category as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  private async findOwnedCustomCategory(
    userId: string,
    categoryId: string,
    forbiddenMessage: string = CATEGORY_MESSAGES.DEFAULT_CANNOT_BE_MODIFIED,
  ): Promise<CategoryDocument> {
    const category = await this.findOne(userId, categoryId);

    if (category.isDefault) {
      throw new ForbiddenActionException(forbiddenMessage);
    }

    return category;
  }

  private async ensureNameIsUnique(
    userId: string,
    name: string,
    type: CategoryType,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await this.categoryModel
      .findOne({
        $or: [{ userId }, { isDefault: true }],
        name,
        type,
        ...(excludeCategoryId ? { _id: { $ne: excludeCategoryId } } : {}),
      })
      .collation({ locale: 'en', strength: 2 })
      .exec();

    if (existing) {
      throw new ResourceAlreadyExistsException(
        CATEGORY_MESSAGES.DUPLICATE_NAME,
      );
    }
  }

  private async seedDefaultCategories(): Promise<void> {
    for (const seed of DEFAULT_CATEGORIES) {
      await this.categoryModel
        .updateOne(
          { isDefault: true, name: seed.name, type: seed.type },
          { $setOnInsert: { ...seed, isDefault: true, userId: null } },
          { upsert: true },
        )
        .exec();
    }
    this.logger.log(
      `Ensured ${DEFAULT_CATEGORIES.length} default categories exist`,
    );
  }

  private translateDuplicateKeyError(error: unknown): unknown {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR_CODE
    ) {
      return new ResourceAlreadyExistsException(
        CATEGORY_MESSAGES.DUPLICATE_NAME,
      );
    }
    return error;
  }
}
