import { IsString, IsOptional } from 'class-validator';

export class UpdateGenusDto {
  @IsString()
  @IsOptional()
  nameRu?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
