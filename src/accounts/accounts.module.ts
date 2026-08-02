import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountBalanceService } from './services/account-balance.service';
import { Account, AccountSchema } from './schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    HouseholdModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService, AccountBalanceService],
  exports: [AccountsService, AccountBalanceService],
})
export class AccountsModule {}
