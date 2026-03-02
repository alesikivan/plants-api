import { IsNotEmpty, IsString } from 'class-validator';

export class CreateShelfDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
