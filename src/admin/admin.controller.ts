import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService, AdminInfoResponse } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('info')
  @Roles(Role.ADMIN)
  async getInfo(): Promise<AdminInfoResponse> {
    return this.adminService.getInfo();
  }
}
