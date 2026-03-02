import { IsMongoId, IsOptional, IsString, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePlantDto {
  @IsMongoId()
  @IsOptional()
  genusId?: string;

  @IsMongoId()
  @IsOptional()
  varietyId?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  shelfIds?: string[];

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removeVariety?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  removePhoto?: boolean;
}
