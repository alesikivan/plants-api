import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Param, Query, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileWithStatsDto } from './dto/user-profile-with-stats.dto';
import { SeoSitemapUserDto } from './dto/seo-sitemap.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from './schemas/user.schema';
import { FILE_UPLOAD_CONFIG, createImageUploadOptions } from '../config/file-upload.config';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: UserDocument): Promise<UserResponseDto> {
    return this.usersService.toResponseDto(user);
  }

  @Get('search')
  @OptionalAuth()
  async searchUsers(
    @Query('q') query?: string,
    @Query('sort') sort?: string,
  ): Promise<UserProfileWithStatsDto[]> {
    return this.usersService.searchUsers(query, sort);
  }

  @Get('seo/sitemap')
  @Public()
  async getSeoSitemap(): Promise<SeoSitemapUserDto[]> {
    return this.usersService.getSeoSitemap();
  }

  @Get(':id/profile')
  @OptionalAuth()
  async getUserProfile(
    @Param('id') id: string,
    @CurrentUser() requester?: UserDocument,
  ): Promise<UserProfileWithStatsDto> {
    return this.usersService.getUserProfileWithStats(id, requester);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.updateProfile(user._id.toString(), updateUserDto);
    return this.usersService.toResponseDto(updatedUser);
  }

  @Patch('profile/avatar')
  @UseInterceptors(
    FileInterceptor(
      'avatar',
      createImageUploadOptions(
        FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS,
        FILE_UPLOAD_CONFIG.FILE_PREFIXES.AVATARS,
      ),
    ),
  )
  async uploadAvatar(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.uploadAvatar(user._id.toString(), file);
    return this.usersService.toResponseDto(updatedUser);
  }

  @Delete('profile/avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@CurrentUser() user: UserDocument): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.removeAvatar(user._id.toString());
    return this.usersService.toResponseDto(updatedUser);
  }

  @Get('avatar/:filename')
  @Public()
  async getAvatar(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `${FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS}/${filename}`;
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Аватар не найден');
    }
    return res.sendFile(filename, { root: FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS });
  }

  @Get(':userId/plants')
  @OptionalAuth()
  async getUserPlants(
    @Param('userId') userId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserPlants(userId, requester);
  }

  @Get(':userId/plants/:plantId/history')
  @OptionalAuth()
  async getUserPlantHistory(
    @Param('userId') userId: string,
    @Param('plantId') plantId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserPlantHistory(userId, plantId, requester);
  }

  @Get(':userId/plants/:plantId')
  @OptionalAuth()
  async getUserPlant(
    @Param('userId') userId: string,
    @Param('plantId') plantId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserPlant(userId, plantId, requester);
  }

  @Get(':userId/wishlist')
  @OptionalAuth()
  async getUserWishlist(
    @Param('userId') userId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserWishlist(userId, requester);
  }

  @Get(':userId/shelves')
  @OptionalAuth()
  async getUserShelves(
    @Param('userId') userId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserShelves(userId, requester);
  }

  @Get(':userId/shelves/:shelfId')
  @OptionalAuth()
  async getUserShelf(
    @Param('userId') userId: string,
    @Param('shelfId') shelfId: string,
    @CurrentUser() requester?: UserDocument,
  ) {
    return this.usersService.getUserShelf(userId, shelfId, requester);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(user => this.usersService.toResponseDto(user));
  }

  // Admin: create user
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async adminCreateUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { user } = await this.usersService.create(createUserDto, true);
    return this.usersService.toResponseDto(user);
  }

  // Admin: update user (name, email, role, isBlocked)
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async adminUpdateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.adminUpdateUser(id, dto);
    return this.usersService.toResponseDto(user);
  }

  // Admin: delete user
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async adminDeleteUser(@Param('id') id: string): Promise<void> {
    await this.usersService.adminDeleteUser(id);
  }
}
