import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: "The account's current password" })
  @IsString()
  currentPassword!: string;

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
