import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class UpdateVarietyDto {
  @IsString()
  @IsOptional()
  nameRu?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsMongoId()
  @IsOptional()
  genusId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
