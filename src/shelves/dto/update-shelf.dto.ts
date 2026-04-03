import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateShelfDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
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
