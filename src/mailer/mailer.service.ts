import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { renderEmail } from './email-template';

interface EmailTemplate {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  buttonText: string;
  linkText: string;
  validity: string;
  ignoreText: string;
  footer: string;
}

// Logo is attached inline (cid) so it shows regardless of FRONTEND_URL reachability
const LOGO_CID = 'plantsheep-logo';
const LOGO_PATH = path.join(__dirname, 'assets', 'logo.png');

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logo: Buffer | null = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;

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
      preheader: await this.i18n.translate(`${prefix}.preheader`, { lang: language }),
      heading: await this.i18n.translate(`${prefix}.heading`, { lang: language }),
      intro: await this.i18n.translate(`${prefix}.intro`, { lang: language }),
      buttonText: await this.i18n.translate(`${prefix}.buttonText`, { lang: language }),
      linkText: await this.i18n.translate(`${prefix}.linkText`, { lang: language }),
      validity: await this.i18n.translate(`${prefix}.validity`, { lang: language }),
      ignoreText: await this.i18n.translate(`${prefix}.ignoreText`, { lang: language }),
      footer: await this.i18n.translate('emails.footer', { lang: language }),
    };
  }

  private generateEmailHtml(template: EmailTemplate, link: string, siteUrl: string, language: string): string {
    return renderEmail({ ...template, link, siteUrl, lang: language, logoSrc: this.logo ? `cid:${LOGO_CID}` : null });
  }

  private get attachments(): nodemailer.SendMailOptions['attachments'] {
    return this.logo ? [{ filename: 'logo.png', content: this.logo, cid: LOGO_CID }] : [];
  }

  async sendPasswordResetEmail(to: string, token: string, frontendUrl: string, language: string = 'en'): Promise<void> {
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const from = this.configService.get<string>('smtp.from');
    const template = await this.getTemplate('passwordReset', language);
    const html = this.generateEmailHtml(template, resetLink, frontendUrl, language);

    await this.transporter.sendMail({
      from,
      to,
      subject: template.subject,
      html,
      attachments: this.attachments,
    });
  }

  async sendVerificationEmail(to: string, token: string, frontendUrl: string, language: string = 'en'): Promise<void> {
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const from = this.configService.get<string>('smtp.from');
    const template = await this.getTemplate('verification', language);
    const html = this.generateEmailHtml(template, verificationLink, frontendUrl, language);

    await this.transporter.sendMail({
      from,
      to,
      subject: template.subject,
      html,
      attachments: this.attachments,
    });
  }
}
