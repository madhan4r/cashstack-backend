import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RefreshJwtAuthGuard } from '../common/guards/refresh-jwt-auth.guard';
import { AUTH_MESSAGES } from '../common/constants';
import type { JwtPayloadWithRefreshToken } from '../common/interfaces';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and returns an access/refresh token pair.',
  })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  async register(@Body() dto: RegisterDto) {
    const { user, tokens } = await this.authService.register(dto);
    return {
      message: AUTH_MESSAGES.REGISTER_SUCCESS,
      data: { ...tokens, user: this.usersService.toSanitized(user) },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates a user with email and password, returning an access/refresh token pair.',
  })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto);
    return {
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      data: { ...tokens, user: this.usersService.toSanitized(user) },
    };
  }

  @Public()
  @UseGuards(RefreshJwtAuthGuard)
  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token (sent as a Bearer token) for a new access/refresh token pair, rotating the refresh token.',
  })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    type: TokenPairDto,
  })
  async refresh(@CurrentUser() currentUser: JwtPayloadWithRefreshToken) {
    const { user, tokens } = await this.authService.refresh(
      currentUser.sub,
      currentUser.refreshToken,
    );
    return {
      message: AUTH_MESSAGES.TOKEN_REFRESH_SUCCESS,
      data: { ...tokens, user: this.usersService.toSanitized(user) },
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset',
    description:
      "Sends a password reset link to the given email if an account exists for it. Always returns success, regardless of whether the email is registered, so the endpoint can't be used to enumerate accounts.",
  })
  @ApiOkResponse({
    description: 'Password reset email sent (if the account exists)',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
      data: null,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Sets a new password using the token from the emailed reset link. The token is single-use and expires 30 minutes after being requested; on success, all existing sessions are invalidated.',
  })
  @ApiOkResponse({ description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return {
      message: AUTH_MESSAGES.RESET_PASSWORD_SUCCESS,
      data: null,
    };
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description:
      "Changes the currently authenticated user's password after verifying their current password. Invalidates the refresh token, so every session must sign in again.",
  })
  @ApiOkResponse({ description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return {
      message: AUTH_MESSAGES.CHANGE_PASSWORD_SUCCESS,
      data: null,
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out',
    description:
      "Invalidates the current user's refresh token so it can no longer be used.",
  })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@CurrentUser('sub') userId: string) {
    await this.authService.logout(userId);
    return {
      message: AUTH_MESSAGES.LOGOUT_SUCCESS,
      data: null,
    };
  }
}
