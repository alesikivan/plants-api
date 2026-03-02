import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateVarietyDto {
  @IsString()
  @IsNotEmpty()
  nameRu: string;

  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @IsMongoId()
  @IsNotEmpty()
  genusId: string;

  @IsString()
  @IsOptional()
  description?: string;
}
