import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateGenusDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}
