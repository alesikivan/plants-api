import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('smtp.host'),
      port: this.configService.get<number>('smtp.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.pass'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string, frontendUrl: string): Promise<void> {
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const from = this.configService.get<string>('smtp.from');

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Сброс пароля — PlantSheep',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2d6a4f;">Сброс пароля PlantSheep</h2>
          <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
          <a href="${resetLink}"
             style="display: inline-block; background-color: #2d6a4f; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Сбросить пароль
          </a>
          <p style="color: #666; font-size: 14px;">Или перейдите по ссылке: <a href="${resetLink}">${resetLink}</a></p>
          <p style="color: #666; font-size: 14px;">Ссылка действительна 1 час.</p>
          <p style="color: #999; font-size: 12px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        </div>
      `,
    });
  }

  async sendVerificationEmail(to: string, token: string, frontendUrl: string): Promise<void> {
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const from = this.configService.get<string>('smtp.from');

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Подтверждение email — PlantSheep',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2d6a4f;">Добро пожаловать в PlantSheep!</h2>
          <p>Для завершения регистрации подтвердите ваш email-адрес, нажав на кнопку ниже:</p>
          <a href="${verificationLink}"
             style="display: inline-block; background-color: #2d6a4f; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Подтвердить email
          </a>
          <p style="color: #666; font-size: 14px;">Или перейдите по ссылке: <a href="${verificationLink}">${verificationLink}</a></p>
          <p style="color: #666; font-size: 14px;">Ссылка действительна 24 часа.</p>
          <p style="color: #999; font-size: 12px;">Если вы не регистрировались в PlantSheep, просто проигнорируйте это письмо.</p>
        </div>
      `,
    });
  }
}
