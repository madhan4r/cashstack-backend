import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The password reset token from the emailed reset link',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'New account password, minimum 8 characters',
    example: 'N3wStr0ngP@ssword',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
