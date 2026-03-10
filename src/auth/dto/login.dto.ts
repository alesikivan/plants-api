import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @IsEmail({}, { message: i18nValidationMessage('validation.auth.emailInvalid') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.auth.emailRequired') })
  email: string;

  @IsString({ message: i18nValidationMessage('validation.auth.passwordString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.auth.passwordRequired') })
  password: string;
}
