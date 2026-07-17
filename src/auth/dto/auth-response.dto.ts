import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto';

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT access token' })
  accessToken!: string;

  @ApiProperty({ description: 'Long-lived JWT refresh token' })
  refreshToken!: string;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
