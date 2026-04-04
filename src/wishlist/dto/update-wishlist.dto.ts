import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateWishlistDto {
  @IsOptional()
  @IsString()
  genusId?: string;

  @IsOptional()
  @IsString()
  varietyId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  removeVariety?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  removePhoto?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  note?: string;

  @IsOptional()
  photo?: any;
}
