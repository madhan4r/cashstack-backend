import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { ParseObjectIdPipe } from '../common/pipes';
import { CATEGORY_MESSAGES } from '../common/constants';
import { CategoriesService } from './categories.service';
import { CategoryStatsService } from './services/category-stats.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly categoryStatsService: CategoryStatsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a custom category',
    description:
      'Creates a new custom income or expense category for the authenticated user. Category names must be unique per user and type (also checked against default categories).',
  })
  @ApiCreatedResponse({
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const category = await this.categoriesService.create(userId, dto);
    return {
      message: CATEGORY_MESSAGES.CREATED,
      data: this.categoriesService.toSanitized(category),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List categories',
    description:
      'Lists every category visible to the authenticated user: built-in default categories plus their own custom categories.',
  })
  @ApiOkResponse({
    description: 'Categories fetched successfully',
    type: [CategoryResponseDto],
  })
  async findAll(@CurrentUser('sub') userId: string) {
    const categories = await this.categoriesService.findAll(userId);
    const statsById = await this.categoryStatsService.getStatsByCategory(
      userId,
      categories.map((category) => category._id.toString()),
    );

    return {
      message: CATEGORY_MESSAGES.LIST_FETCHED,
      data: categories.map((category) =>
        this.categoriesService.toSanitized(
          category,
          statsById.get(category._id.toString()),
        ),
      ),
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a category by ID',
    description:
      'Fetches a single default or custom category visible to the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Category fetched successfully',
    type: CategoryResponseDto,
  })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const category = await this.categoriesService.findOne(userId, id);
    const stats = await this.categoryStatsService.getStatsForCategory(
      userId,
      id,
    );
    return {
      message: CATEGORY_MESSAGES.FETCHED,
      data: this.categoriesService.toSanitized(category, stats),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a custom category',
    description:
      'Updates a custom category owned by the authenticated user. Default categories cannot be modified.',
  })
  @ApiOkResponse({
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(userId, id, dto);
    return {
      message: CATEGORY_MESSAGES.UPDATED,
      data: this.categoriesService.toSanitized(category),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a custom category',
    description:
      'Deletes a custom category owned by the authenticated user. Default categories cannot be deleted.',
  })
  @ApiOkResponse({ description: 'Category deleted successfully' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    await this.categoriesService.remove(userId, id);
    return {
      message: CATEGORY_MESSAGES.DELETED,
      data: null,
    };
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive a category',
    description:
      'Hides a category (default or custom) from the default category list without deleting it.',
  })
  @ApiOkResponse({
    description: 'Category archived successfully',
    type: CategoryResponseDto,
  })
  async archive(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const category = await this.categoriesService.archive(userId, id);
    return {
      message: CATEGORY_MESSAGES.ARCHIVED,
      data: this.categoriesService.toSanitized(category),
    };
  }

  @Patch(':id/unarchive')
  @ApiOperation({
    summary: 'Unarchive a category',
    description: 'Restores a previously archived category to active status.',
  })
  @ApiOkResponse({
    description: 'Category unarchived successfully',
    type: CategoryResponseDto,
  })
  async unarchive(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const category = await this.categoriesService.unarchive(userId, id);
    return {
      message: CATEGORY_MESSAGES.UNARCHIVED,
      data: this.categoriesService.toSanitized(category),
    };
  }
}
