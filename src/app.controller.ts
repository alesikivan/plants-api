import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      name: 'API Service',
      version: '1.0.1',
      status: 'running',
    };
  }
}
