import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

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
}
