import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(30)
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  name: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsOptional()
  @IsIn(['ru', 'en'])
  preferredLanguage?: string;
}
