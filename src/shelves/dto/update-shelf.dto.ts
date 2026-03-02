import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateShelfDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  removePhoto?: boolean;
}
