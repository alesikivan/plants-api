import { Controller, Post, Delete, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FollowsService, FollowListDto, FollowStatsDto } from './follows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async follow(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<void> {
    await this.followsService.follow(currentUser._id.toString(), userId);
  }

  @Delete(':userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserDocument,
  ): Promise<void> {
    await this.followsService.unfollow(currentUser._id.toString(), userId);
  }

  @Get(':userId/stats')
  async getStats(
    @Param('userId') userId: string,
    @CurrentUser() currentUser?: UserDocument,
  ): Promise<FollowStatsDto> {
    return this.followsService.getStats(userId, currentUser?._id.toString());
  }

  @Get(':userId/followers')
  async getFollowers(
    @Param('userId') userId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<FollowListDto> {
    return this.followsService.getFollowers(
      userId,
      q,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':userId/following')
  async getFollowing(
    @Param('userId') userId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<FollowListDto> {
    return this.followsService.getFollowing(
      userId,
      q,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
