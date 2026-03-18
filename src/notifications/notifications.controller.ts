import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { NotificationsService, NotificationsResponse } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@CurrentUser() user: any): Promise<NotificationsResponse> {
    return this.notificationsService.findAll(user._id.toString());
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(user._id.toString());
    return { count };
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: any): Promise<void> {
    return this.notificationsService.markAllRead(user._id.toString());
  }

  @Delete()
  async clearAll(@CurrentUser() user: any): Promise<void> {
    return this.notificationsService.clearAll(user._id.toString());
  }
}
