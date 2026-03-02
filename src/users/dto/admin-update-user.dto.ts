import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class AdminUpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;
}
