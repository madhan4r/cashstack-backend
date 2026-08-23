import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { HouseholdModule } from '../household/household.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecurringController } from './recurring.controller';
import { RecurringReminderScheduler } from './recurring-reminder.scheduler';
import { RecurringService } from './recurring.service';
import {
  RecurringOccurrence,
  RecurringOccurrenceSchema,
} from './schemas/recurring-occurrence.schema';
import {
  RecurringTransaction,
  RecurringTransactionSchema,
} from './schemas/recurring-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecurringTransaction.name, schema: RecurringTransactionSchema },
      { name: RecurringOccurrence.name, schema: RecurringOccurrenceSchema },
    ]),
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    HouseholdModule,
    NotificationsModule,
  ],
  controllers: [RecurringController],
  providers: [RecurringService, RecurringReminderScheduler],
  exports: [RecurringService],
})
export class RecurringModule {}
