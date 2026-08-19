import { Controller, Get, Post, Body, UseGuards, Query, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FILE_UPLOAD_CONFIG, createImageFileFilter } from '../config/file-upload.config';
import { TelegramService, CommunityTopic, COMMUNITY_TOPICS } from '../telegram/telegram.service';
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

class TelegramBroadcastDto {
  @IsOptional()
  @IsString()
  text?: string;

  /** Topics: JSON array or comma-separated list of general|plants|history */
  @IsString()
  @IsNotEmpty()
  topics: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly aiRecognitionLogService: AiRecognitionLogService,
    private readonly telegramService: TelegramService,
  ) {}

  /** Manual message from the bot into the Telegram community (plain text + up to 10 photos, selected topics) */
  @Post('telegram/broadcast')
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      storage: memoryStorage(),
      fileFilter: createImageFileFilter(),
      limits: { fileSize: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE },
    }),
  )
  async telegramBroadcast(
    @Body() dto: TelegramBroadcastDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ sent: number }> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(dto.topics);
    } catch {
      parsed = dto.topics.split(',');
    }
    const topics = (Array.isArray(parsed) ? parsed : [parsed])
      .map(t => String(t).trim())
      .filter((t): t is CommunityTopic => (COMMUNITY_TOPICS as string[]).includes(t));
    if (topics.length === 0) {
      throw new BadRequestException('Select at least one topic');
    }
    const text = (dto.text || '').trim();
    if (!text && (!files || files.length === 0)) {
      throw new BadRequestException('Message text or photos are required');
    }
    if (!this.telegramService.isCommunityConfigured) {
      throw new BadRequestException('Telegram community is not configured');
    }
    return this.telegramService.broadcastToCommunity({
      text,
      photos: (files || []).map(f => ({ buffer: f.buffer, filename: f.originalname || 'photo.jpg' })),
      topics,
    });
  }

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
