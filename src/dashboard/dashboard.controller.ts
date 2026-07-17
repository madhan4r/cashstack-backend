import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { DASHBOARD_MESSAGES } from '../common/constants';
import { DashboardService } from './dashboard.service';
import { DashboardDataDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      "Returns the data required for the application's home screen: current balance, this month's income/expense/savings, remaining budget, the last 10 transactions, this month's expense breakdown by category, a summary of active accounts, and the income/expense/savings trend for the last 6 months. All values are computed dynamically via MongoDB aggregation and scoped to the authenticated user.",
  })
  @ApiOkResponse({
    description: 'Dashboard fetched successfully.',
    type: DashboardDataDto,
  })
  async getDashboard(@CurrentUser('sub') userId: string) {
    const data = await this.dashboardService.getDashboard(userId);
    return {
      message: DASHBOARD_MESSAGES.FETCHED,
      data,
    };
  }
}
