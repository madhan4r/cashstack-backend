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
import { HOUSEHOLD_MESSAGES } from '../common/constants';
import {
  HouseholdInviteResponseDto,
  HouseholdResponseDto,
  InviteMemberDto,
  RespondToInviteDto,
  SetViewModeDto,
} from './dto';
import { HouseholdService } from './household.service';

@ApiTags('Household')
@ApiBearerAuth()
@Controller({ path: 'households', version: '1' })
export class HouseholdController {
  constructor(private readonly householdService: HouseholdService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my household and its members' })
  @ApiOkResponse({
    description: 'Household fetched successfully (null if not in one)',
    type: HouseholdResponseDto,
  })
  async getMyHousehold(@CurrentUser('sub') userId: string) {
    const household = await this.householdService.getMyHousehold(userId);
    return { message: HOUSEHOLD_MESSAGES.FETCHED, data: household };
  }

  @Post('invites')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite someone into your household by email',
    description:
      'Creates your household on first invite if you don’t have one yet. If the invitee already has an account they’ll see this as a pending invite; otherwise it’s applied automatically the moment they register with that email.',
  })
  @ApiCreatedResponse({
    description: 'Invite sent',
    type: HouseholdInviteResponseDto,
  })
  async inviteMember(
    @CurrentUser('sub') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    const invite = await this.householdService.inviteMember(userId, dto.email);
    return { message: HOUSEHOLD_MESSAGES.INVITED, data: invite };
  }

  @Get('invites/me')
  @ApiOperation({ summary: 'List pending invites addressed to me' })
  @ApiOkResponse({
    description: 'Pending invites fetched successfully',
    type: [HouseholdInviteResponseDto],
  })
  async getMyInvites(@CurrentUser('email') email: string) {
    const invites =
      await this.householdService.getPendingInvitesForEmail(email);
    return { message: HOUSEHOLD_MESSAGES.INVITES_FETCHED, data: invites };
  }

  @Post('invites/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or decline an invite addressed to me' })
  @ApiOkResponse({ description: 'Invite responded to successfully' })
  async respondToInvite(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RespondToInviteDto,
  ) {
    await this.householdService.respondToInvite(userId, id, dto.accept);
    return {
      message: dto.accept
        ? HOUSEHOLD_MESSAGES.INVITE_ACCEPTED
        : HOUSEHOLD_MESSAGES.INVITE_DECLINED,
      data: null,
    };
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending invite you or a member sent' })
  @ApiOkResponse({ description: 'Invite cancelled successfully' })
  async cancelInvite(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.householdService.cancelInvite(userId, id);
    return { message: HOUSEHOLD_MESSAGES.INVITE_CANCELLED, data: null };
  }

  @Patch('view-mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set whether you see the household combined or just your own data',
    description:
      'A personal preference, not a household-wide setting — other members are unaffected by your choice.',
  })
  @ApiOkResponse({ description: 'View mode updated successfully' })
  async setViewMode(
    @CurrentUser('sub') userId: string,
    @Body() dto: SetViewModeDto,
  ) {
    await this.householdService.setViewMode(userId, dto.mode);
    return { message: HOUSEHOLD_MESSAGES.VIEW_MODE_UPDATED, data: null };
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave your current household' })
  @ApiOkResponse({ description: 'Left the household successfully' })
  async leave(@CurrentUser('sub') userId: string) {
    await this.householdService.leaveHousehold(userId);
    return { message: HOUSEHOLD_MESSAGES.LEFT, data: null };
  }
}
