import { ApiProperty } from '@nestjs/swagger';
import { HouseholdViewMode } from '../enums';

export class HouseholdMemberDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email!: string;
}

export class HouseholdResponseDto {
  @ApiProperty({ example: '64f1c2e5b3f1a2c3d4e5f6a7' })
  id!: string;

  @ApiProperty({ example: "Jane's Household" })
  name!: string;

  @ApiProperty({
    enum: HouseholdViewMode,
    example: HouseholdViewMode.COMBINED,
    description:
      "The caller's own combine/separate preference — not a household-wide setting.",
  })
  viewMode!: HouseholdViewMode;

  @ApiProperty({ type: [HouseholdMemberDto] })
  members!: HouseholdMemberDto[];
}
