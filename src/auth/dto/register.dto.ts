import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @IsEmail({}, { message: i18nValidationMessage('validation.auth.emailInvalid') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.auth.emailRequired') })
  @Transform(({ value }) => value?.trim())
  email: string;

  @IsString({ message: i18nValidationMessage('validation.auth.passwordString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.auth.passwordRequired') })
  @MinLength(6, { message: i18nValidationMessage('validation.auth.passwordMinLength') })
  password: string;

  @IsString({ message: i18nValidationMessage('validation.auth.nameString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.auth.nameRequired') })
  @MinLength(5, { message: i18nValidationMessage('validation.auth.nameMinLength') })
  @MaxLength(30, { message: i18nValidationMessage('validation.auth.nameMaxLength') })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' '))
  name: string;

  @IsOptional()
  @IsIn(['ru', 'en'])
  preferredLanguage?: string;
}
