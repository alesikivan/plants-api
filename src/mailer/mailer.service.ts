import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as nodemailer from 'nodemailer';

interface EmailTemplate {
  subject: string;
  heading: string;
  intro: string;
  buttonText: string;
  linkText: string;
  validity: string;
  ignoreText: string;
}

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private i18n: I18nService,
  ) {
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

  private async getTemplate(type: 'verification' | 'passwordReset', language: string = 'en'): Promise<EmailTemplate> {
    const prefix = `emails.${type}`;
    return {
      subject: await this.i18n.translate(`${prefix}.subject`, { lang: language }),
      heading: await this.i18n.translate(`${prefix}.heading`, { lang: language }),
      intro: await this.i18n.translate(`${prefix}.intro`, { lang: language }),
      buttonText: await this.i18n.translate(`${prefix}.buttonText`, { lang: language }),
      linkText: await this.i18n.translate(`${prefix}.linkText`, { lang: language }),
      validity: await this.i18n.translate(`${prefix}.validity`, { lang: language }),
      ignoreText: await this.i18n.translate(`${prefix}.ignoreText`, { lang: language }),
    };
  }

  private generateEmailHtml(template: EmailTemplate, link: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2d6a4f;">${template.heading}</h2>
        <p>${template.intro}</p>
        <a href="${link}"
           style="display: inline-block; background-color: #2d6a4f; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 16px 0;">
          ${template.buttonText}
        </a>
        <p style="color: #666; font-size: 14px;">${template.linkText} <a href="${link}">${link}</a></p>
        <p style="color: #666; font-size: 14px;">${template.validity}</p>
        <p style="color: #999; font-size: 12px;">${template.ignoreText}</p>
      </div>
    `;
  }

  async sendPasswordResetEmail(to: string, token: string, frontendUrl: string, language: string = 'en'): Promise<void> {
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const from = this.configService.get<string>('smtp.from');
    const template = await this.getTemplate('passwordReset', language);
    const html = this.generateEmailHtml(template, resetLink);

    await this.transporter.sendMail({
      from,
      to,
      subject: template.subject,
      html,
    });
  }

  async sendVerificationEmail(to: string, token: string, frontendUrl: string, language: string = 'en'): Promise<void> {
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const from = this.configService.get<string>('smtp.from');
    const template = await this.getTemplate('verification', language);
    const html = this.generateEmailHtml(template, verificationLink);

    await this.transporter.sendMail({
      from,
      to,
      subject: template.subject,
      html,
    });
  }
}
