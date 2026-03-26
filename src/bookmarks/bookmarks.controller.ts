import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeedResponse } from '../feed/feed.service';

class ToggleBookmarkDto {
  @IsIn(['plant', 'plant_history'])
  itemType: 'plant' | 'plant_history';

  @IsString()
  itemId: string;
}

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post('toggle')
  async toggle(
    @CurrentUser() user: any,
    @Body() dto: ToggleBookmarkDto,
  ): Promise<{ bookmarked: boolean }> {
    return this.bookmarksService.toggle(user._id.toString(), dto.itemType, dto.itemId);
  }

  @Get('plants')
  async getSavedPlants(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('genusId') genusId?: string,
  ): Promise<any[]> {
    return this.bookmarksService.getSavedPlants(user._id.toString(), { search, genusId });
  }

  @Get('status')
  async getBookmarkStatus(
    @CurrentUser() user: any,
    @Query('itemType') itemType: string,
    @Query('itemId') itemId: string,
  ): Promise<{ isBookmarked: boolean }> {
    if (!itemType || !itemId) throw new BadRequestException('itemType and itemId are required');
    if (itemType !== 'plant' && itemType !== 'plant_history') {
      throw new BadRequestException('itemType must be plant or plant_history');
    }
    return this.bookmarksService.getBookmarkStatus(user._id.toString(), itemType, itemId);
  }

  @Get('feed')
  async getSavedFeed(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<FeedResponse> {
    return this.bookmarksService.getSavedFeed(
      user._id.toString(),
      cursor,
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
    );
  }
}
