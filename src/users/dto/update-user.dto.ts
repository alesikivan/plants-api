import { IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsString, MaxLength, MinLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SocialLinkDto {
  @IsString()
  type: string;

  @IsString()
  value: string;

  @IsBoolean()
  isPublic: boolean;
}

export class UpdateUserDto {
  @IsString()
  @MinLength(5)
  @MaxLength(17)
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  bio?: string;

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
