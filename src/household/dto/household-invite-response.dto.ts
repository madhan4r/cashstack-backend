import { ApiProperty } from '@nestjs/swagger';
import { HouseholdInviteStatus } from '../enums';

export class HouseholdInviteResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  householdId!: string;

  @ApiProperty({ example: "Jane's Household" })
  householdName!: string;

  @ApiProperty({ example: 'partner@example.com' })
  invitedEmail!: string;

  @ApiProperty({ example: 'Jane Doe' })
  invitedByName!: string;

  @ApiProperty({
    enum: HouseholdInviteStatus,
    example: HouseholdInviteStatus.PENDING,
  })
  status!: HouseholdInviteStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
