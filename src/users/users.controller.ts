import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { USER_MESSAGES } from '../common/constants';
import type { JwtPayload } from '../common/interfaces';
import { UpdateProfileDto, UserResponseDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
