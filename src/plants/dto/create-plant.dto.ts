import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePlantDto {
  @IsMongoId()
  @IsNotEmpty()
  genusId: string;

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
  withFirstHistory?: boolean;

  /** Per-post opt-out of Telegram community publishing (only meaningful when user has auto-publish enabled) */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  publishToTelegram?: boolean;
}
