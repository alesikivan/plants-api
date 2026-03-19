import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdminService, AdminInfoResponse } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AiRecognitionLogService, AiRecognitionStatsResponse, AiRecognitionListResponse } from '../ai-recognition/ai-recognition-log.service';

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
  constructor(
    private readonly adminService: AdminService,
    private readonly aiRecognitionLogService: AiRecognitionLogService,
  ) {}

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

  @Get('ai-recognition/stats')
  @Roles(Role.ADMIN)
  async getAiRecognitionStats(): Promise<AiRecognitionStatsResponse> {
    return this.aiRecognitionLogService.getStats();
  }

  @Get('ai-recognition/list')
  @Roles(Role.ADMIN)
  async getAiRecognitionList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: 'genus' | 'variety',
    @Query('recognized') recognized?: string,
    @Query('cursor') cursor?: string,
  ): Promise<AiRecognitionListResponse> {
    const recognizedFilter =
      recognized === 'true' ? true : recognized === 'false' ? false : undefined;
    return this.aiRecognitionLogService.getList(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      type,
      recognizedFilter,
      cursor,
    );
  }
}
