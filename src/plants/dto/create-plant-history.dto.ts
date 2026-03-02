import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreatePlantHistoryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
