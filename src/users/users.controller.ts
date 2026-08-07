import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { USER_MESSAGES } from '../common/constants';
import { AppException } from '../common/exceptions';
import type { JwtPayload } from '../common/interfaces';
import { UpdateProfileDto, UserResponseDto } from './dto';
import { AvatarService } from './services/avatar.service';
import { UsersService } from './users.service';

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarService: AvatarService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Fetches the profile of the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'The authenticated user profile',
    type: UserResponseDto,
  })
  async getCurrentUser(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.usersService.findById(currentUser.sub);
    return {
      message: USER_MESSAGES.PROFILE_FETCHED,
      data: this.usersService.toSanitized(user),
    };
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: "Updates fields on the authenticated user's profile.",
  })
  @ApiOkResponse({
    description: 'The updated user profile',
    type: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(currentUser.sub, dto);
    return {
      message: USER_MESSAGES.PROFILE_UPDATED,
      data: this.usersService.toSanitized(user),
    };
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', { limits: { fileSize: MAX_AVATAR_SIZE_BYTES } }),
  )
  @ApiOperation({
    summary: "Upload/replace the current user's profile picture",
    description:
      'multipart/form-data with a single "avatar" field. JPEG/PNG/WebP, ' +
      'up to 5MB. Replaces and deletes any previous avatar.',
  })
  @ApiOkResponse({
    description: 'The updated user profile',
    type: UserResponseDto,
  })
  async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new AppException('No file uploaded');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new AppException(
        'Avatar must be a JPEG, PNG, or WebP image',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new AppException(
        'Avatar must be 5MB or smaller',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const previous = await this.usersService.findById(userId);
    const avatarUrl = await this.avatarService.save(userId, file);
    // Best-effort — an orphaned old file on disk is a non-issue, unlike
    // failing the request over cleanup.
    await this.avatarService.delete(previous.avatarUrl);

    const user = await this.usersService.setAvatarUrl(userId, avatarUrl);
    return {
      message: USER_MESSAGES.PROFILE_UPDATED,
      data: this.usersService.toSanitized(user),
    };
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove the current user's profile picture" })
  @ApiOkResponse({
    description: 'The updated user profile',
    type: UserResponseDto,
  })
  async removeAvatar(@CurrentUser('sub') userId: string) {
    const previous = await this.usersService.findById(userId);
    await this.avatarService.delete(previous.avatarUrl);

    const user = await this.usersService.setAvatarUrl(userId, null);
    return {
      message: USER_MESSAGES.PROFILE_UPDATED,
      data: this.usersService.toSanitized(user),
    };
  }
}
