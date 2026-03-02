import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileWithStatsDto } from './dto/user-profile-with-stats.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from './schemas/user.schema';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: UserDocument): Promise<UserResponseDto> {
    return this.usersService.toResponseDto(user);
  }

  @Get('search')
  async searchUsers(@Query('q') query?: string): Promise<UserProfileWithStatsDto[]> {
    return this.usersService.searchUsers(query);
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string): Promise<UserProfileWithStatsDto> {
    return this.usersService.getUserProfileWithStats(id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.updateProfile(user._id.toString(), updateUserDto);
    return this.usersService.toResponseDto(updatedUser);
  }

  @Get(':userId/plants')
  async getUserPlants(
    @Param('userId') userId: string,
    @CurrentUser() requester: UserDocument,
  ) {
    return this.usersService.getUserPlants(userId, requester.role);
  }

  @Get(':userId/plants/:plantId/history')
  async getUserPlantHistory(
    @Param('userId') userId: string,
    @Param('plantId') plantId: string,
    @CurrentUser() requester: UserDocument,
  ) {
    return this.usersService.getUserPlantHistory(userId, plantId, requester.role);
  }

  @Get(':userId/plants/:plantId')
  async getUserPlant(
    @Param('userId') userId: string,
    @Param('plantId') plantId: string,
    @CurrentUser() requester: UserDocument,
  ) {
    return this.usersService.getUserPlant(userId, plantId, requester.role);
  }

  @Get(':userId/shelves')
  async getUserShelves(
    @Param('userId') userId: string,
    @CurrentUser() requester: UserDocument,
  ) {
    return this.usersService.getUserShelves(userId, requester.role);
  }

  @Get(':userId/shelves/:shelfId')
  async getUserShelf(
    @Param('userId') userId: string,
    @Param('shelfId') shelfId: string,
    @CurrentUser() requester: UserDocument,
  ) {
    return this.usersService.getUserShelf(userId, shelfId, requester.role);
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
    const user = await this.usersService.create(createUserDto);
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
