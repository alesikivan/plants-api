import { IsNotEmpty, IsString, IsDateString, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePlantHistoryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  comment?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  skipNotification?: boolean;

  /** Per-post opt-out of Telegram community publishing (only meaningful when user has auto-publish enabled) */
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  publishToTelegram?: boolean;
}
