import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class ValidateVarietyDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsMongoId()
  @IsNotEmpty()
  genusId: string;
}
