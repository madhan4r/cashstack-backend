import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CATEGORY_MESSAGES } from '../common/constants';
import {
  ForbiddenActionException,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { DEFAULT_CATEGORIES } from './constants';
import { CategoryType } from './enums';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SanitizedCategory } from './interfaces';
import { Category, CategoryDocument } from './schemas/category.schema';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
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
    return this.categoryModel
      .find({ $or: [{ userId }, { isDefault: true }] })
      .sort({ type: 1, name: 1 })
      .exec();
  }

  async findOne(userId: string, categoryId: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findOne({
        _id: categoryId,
        $or: [{ userId }, { isDefault: true }],
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
    await category.deleteOne();
  }

  toSanitized(category: CategoryDocument): SanitizedCategory {
    return {
      id: category._id.toString(),
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      isDefault: category.isDefault,
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
