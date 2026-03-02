import { IsString, IsOptional } from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  genusId: string;

  @IsOptional()
  @IsString()
  varietyId?: string;

  @IsOptional()
  photo?: any;
}
