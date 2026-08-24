import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdModule } from '../household/household.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountAlertService } from './services/account-alert.service';
import { AccountBalanceService } from './services/account-balance.service';
import { Account, AccountSchema } from './schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    HouseholdModule,
    NotificationsModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService, AccountBalanceService, AccountAlertService],
  exports: [AccountsService, AccountBalanceService, AccountAlertService],
})
export class AccountsModule {}
