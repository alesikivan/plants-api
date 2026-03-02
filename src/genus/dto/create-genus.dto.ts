import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGenusDto {
  @IsString()
  @IsNotEmpty()
  nameRu: string;

  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @IsString()
  @IsOptional()
  description?: string;
}
