import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  genusId: string;

  @IsOptional()
  @IsString()
  varietyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  note?: string;

  @IsOptional()
  photo?: any;
}
