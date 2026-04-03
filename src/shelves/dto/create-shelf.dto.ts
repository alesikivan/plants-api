import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateShelfDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name: string;
}
