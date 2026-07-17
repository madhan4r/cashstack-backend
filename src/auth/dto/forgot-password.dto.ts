import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send the password reset link to',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  email!: string;
}
