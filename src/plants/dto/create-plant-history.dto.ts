import { IsNotEmpty, IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreatePlantHistoryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  @MaxLength(600)
  comment?: string;
}
