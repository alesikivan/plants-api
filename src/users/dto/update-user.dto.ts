import { IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinkDto {
  @IsString()
  type: string;

  @IsString()
  value: string;

  @IsBoolean()
  isPublic: boolean;
}

export class UpdateUserDto {
  @IsEnum(['ru', 'en'])
  @IsOptional()
  preferredLanguage?: string;

  @IsBoolean()
  @IsOptional()
  showPlants?: boolean;

  @IsBoolean()
  @IsOptional()
  showShelves?: boolean;

  @IsBoolean()
  @IsOptional()
  showPlantHistory?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  @IsOptional()
  socialLinks?: SocialLinkDto[];
}
