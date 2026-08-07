import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { HouseholdViewMode } from '../enums';

export class SetViewModeDto {
  @ApiProperty({
    enum: HouseholdViewMode,
    example: HouseholdViewMode.SEPARATE,
    description:
      "COMBINED to see every household member's data pooled together, SEPARATE to see only your own.",
  })
  @IsEnum(HouseholdViewMode)
  mode!: HouseholdViewMode;
}
