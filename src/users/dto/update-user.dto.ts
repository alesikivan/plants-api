import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

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
}
