import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the current health status of the API.',
  })
  @ApiOkResponse({ description: 'Service is healthy' })
  getHealth() {
    return {
      message: 'Service is healthy',
      data: this.appService.getHealth(),
    };
  }
}
