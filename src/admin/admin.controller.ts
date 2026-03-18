import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminService, AdminInfoResponse } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('info')
  @Roles(Role.ADMIN)
  async getInfo(): Promise<AdminInfoResponse> {
    return this.adminService.getInfo();
  }

  @Post('notifications/broadcast')
  @Roles(Role.ADMIN)
  async broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
  ): Promise<{ sent: number }> {
    return this.adminService.broadcastNotification(dto.title, dto.message, dto.userIds);
  }
}
