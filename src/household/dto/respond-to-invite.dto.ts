import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RespondToInviteDto {
  @ApiProperty({
    description: 'true to accept and join the household, false to decline',
    example: true,
  })
  @IsBoolean()
  accept!: boolean;
}
