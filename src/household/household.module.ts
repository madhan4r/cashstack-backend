import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';
import { Household, HouseholdSchema } from './schemas/household.schema';
import {
  HouseholdInvite,
  HouseholdInviteSchema,
} from './schemas/household-invite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Household.name, schema: HouseholdSchema },
      { name: HouseholdInvite.name, schema: HouseholdInviteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HouseholdController],
  providers: [HouseholdService],
  exports: [HouseholdService],
})
export class HouseholdModule {}
