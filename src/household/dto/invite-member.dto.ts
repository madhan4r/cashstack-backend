import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email of the person to invite into your household',
    example: 'partner@example.com',
  })
  @IsEmail()
  email!: string;
}
