import { Injectable, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import {
  InvalidCredentialsException,
  InvalidRefreshTokenException,
  InvalidResetTokenException,
  ResourceAlreadyExistsException,
} from '../common/exceptions';
import { AUTH_MESSAGES } from '../common/constants';
import { JwtPayload } from '../common/interfaces';
import { hashValue, verifyHash } from '../common/utils';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenPairDto } from './dto/auth-response.dto';

const PASSWORD_RESET_TOKEN_TYPE = 'password_reset';
const PASSWORD_RESET_EXPIRES_IN = '30m';

interface PasswordResetTokenPayload {
  sub: string;
  type: typeof PASSWORD_RESET_TOKEN_TYPE;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: UserDocument; tokens: TokenPairDto }> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ResourceAlreadyExistsException(
        AUTH_MESSAGES.EMAIL_ALREADY_EXISTS,
      );
    }

    const passwordHash = await hashValue(dto.password);
    const user = await this.usersService.create(
      dto.fullName,
      dto.email,
      passwordHash,
    );

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserDocument; tokens: TokenPairDto }> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new InvalidCredentialsException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await verifyHash(user.password, dto.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async refresh(
    userId: string,
    presentedRefreshToken: string,
  ): Promise<{ user: UserDocument; tokens: TokenPairDto }> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user?.currentRefreshTokenHash) {
      throw new InvalidRefreshTokenException(
        AUTH_MESSAGES.INVALID_REFRESH_TOKEN,
      );
    }

    const isTokenValid = await verifyHash(
      user.currentRefreshTokenHash,
      presentedRefreshToken,
    );
    if (!isTokenValid) {
      throw new InvalidRefreshTokenException(
        AUTH_MESSAGES.INVALID_REFRESH_TOKEN,
      );
    }

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setCurrentRefreshTokenHash(userId, null);
  }

  /**
   * Always resolves successfully regardless of whether the email is
   * registered, so the endpoint can't be used to enumerate accounts.
   *
   * There is no email provider wired up yet — the reset link is logged
   * instead of sent. Swap `logger.log` for a real mailer call once one
   * exists; nothing else about this flow needs to change.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return;
    }

    const payload: PasswordResetTokenPayload = {
      sub: user._id.toString(),
      type: PASSWORD_RESET_TOKEN_TYPE,
    };
    // Signed with the refresh secret (not the access secret) so a reset
    // token can never be replayed as a live access token — at worst it can
    // be tried as a refresh token, which additionally requires matching the
    // user's stored `currentRefreshTokenHash`, which this token never is.
    const resetToken = await this.jwtService.signAsync(payload, {
      secret: this.appConfigService.jwt.refreshSecret,
      expiresIn: PASSWORD_RESET_EXPIRES_IN,
    });

    await this.usersService.setPasswordResetTokenHash(
      user._id.toString(),
      await hashValue(resetToken),
    );

    const resetLink = `${this.appConfigService.app.clientUrl}/reset-password?token=${resetToken}`;
    this.logger.log(
      `Password reset requested for ${user.email}. Reset link (dev only, no email provider configured): ${resetLink}`,
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const payload = await this.verifyResetToken(dto.token);

    const user = await this.usersService.findByIdWithPasswordResetHash(
      payload.sub,
    );
    if (!user?.passwordResetTokenHash) {
      throw new InvalidResetTokenException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const isTokenValid = await verifyHash(
      user.passwordResetTokenHash,
      dto.token,
    );
    if (!isTokenValid) {
      throw new InvalidResetTokenException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }

    const passwordHash = await hashValue(dto.newPassword);
    await this.usersService.resetPassword(user._id.toString(), passwordHash);
  }

  private async verifyResetToken(
    token: string,
  ): Promise<PasswordResetTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<
        PasswordResetTokenPayload & { exp: number; iat: number }
      >(token, { secret: this.appConfigService.jwt.refreshSecret });

      if (payload.type !== PASSWORD_RESET_TOKEN_TYPE) {
        throw new InvalidResetTokenException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
      }

      return payload;
    } catch {
      throw new InvalidResetTokenException(AUTH_MESSAGES.INVALID_RESET_TOKEN);
    }
  }

  private async issueTokens(user: UserDocument): Promise<TokenPairDto> {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.appConfigService.jwt.accessSecret,
        expiresIn: this.appConfigService.jwt
          .accessExpiresIn as JwtSignOptions['expiresIn'],
      }),
      this.jwtService.signAsync(payload, {
        secret: this.appConfigService.jwt.refreshSecret,
        expiresIn: this.appConfigService.jwt
          .refreshExpiresIn as JwtSignOptions['expiresIn'],
      }),
    ]);

    const refreshTokenHash = await hashValue(refreshToken);
    await this.usersService.setCurrentRefreshTokenHash(
      user._id.toString(),
      refreshTokenHash,
    );

    return { accessToken, refreshToken };
  }
}
