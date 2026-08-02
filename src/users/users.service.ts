import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceNotFoundException } from '../common/exceptions';
import { AUTH_MESSAGES } from '../common/constants';
import { UpdateProfileDto } from './dto';
import { SanitizedUser } from './interfaces';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(
    fullName: string,
    email: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    return this.userModel.create({ fullName, email, password: passwordHash });
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new ResourceNotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('+currentRefreshTokenHash')
      .exec();
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!user) {
      throw new ResourceNotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async setCurrentRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { currentRefreshTokenHash: refreshTokenHash })
      .exec();
  }

  async findByIdWithPasswordResetHash(
    id: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordResetTokenHash').exec();
  }

  async setPasswordResetTokenHash(
    id: string,
    passwordResetTokenHash: string | null,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { passwordResetTokenHash })
      .exec();
  }

  /** Updates the password and invalidates the reset token and any active session. */
  async resetPassword(id: string, passwordHash: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        password: passwordHash,
        passwordResetTokenHash: null,
        currentRefreshTokenHash: null,
      })
      .exec();
  }

  toSanitized(user: UserDocument): SanitizedUser {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      preferredCurrency: user.preferredCurrency,
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
      updatedAt: (user as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
