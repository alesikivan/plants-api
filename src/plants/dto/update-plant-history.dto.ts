import { IsOptional, IsString, IsDateString, IsArray, MaxLength } from 'class-validator';

export class UpdatePlantHistoryDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removePhotos?: string[];
}
