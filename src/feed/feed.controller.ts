import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeedService, FeedResponse } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('global')
  async getGlobalFeed(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('genusId') genusId?: string,
    @Query('varietyId') varietyId?: string,
  ): Promise<FeedResponse> {
    return this.feedService.getFeed(
      user._id.toString(),
      'global',
      cursor,
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
      genusId,
      varietyId,
    );
  }

  @Get('following')
  async getFollowingFeed(
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('genusId') genusId?: string,
    @Query('varietyId') varietyId?: string,
  ): Promise<FeedResponse> {
    return this.feedService.getFeed(
      user._id.toString(),
      'following',
      cursor,
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
      genusId,
      varietyId,
    );
  }
}
