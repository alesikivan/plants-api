import { IsEmail, IsString, IsEnum, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

export class AdminUpdateUserDto {
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  name?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;
}
