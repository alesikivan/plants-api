import { IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResetPasswordDto {
  @IsString({ message: i18nValidationMessage('validation.auth.tokenString') })
  token: string;

  @MinLength(6, { message: i18nValidationMessage('validation.auth.passwordMinLength') })
  password: string;
}
