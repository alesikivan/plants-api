import { IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class UpdatePlantHistoryDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removePhotos?: string[];
}
