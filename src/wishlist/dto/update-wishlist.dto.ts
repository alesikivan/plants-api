import { IsString, IsOptional, IsBoolean } from 'class-validator';
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
  photo?: any;
}
