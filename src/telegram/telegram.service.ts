import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
    this.chatId = this.configService.get<string>('telegram.chatId');
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram API error: ${error}`);
      }
    } catch (err) {
      this.logger.error('Failed to send Telegram notification', err);
    }
  }

  async notifyUserRegistered(username: string, email: string): Promise<void> {
    await this.sendMessage(
      `<b>👤 Новый пользователь зарегистрировался</b>\n` +
      `Имя: ${username}\n` +
      `email: ${email}`,
    );
  }

  async notifyEmailVerified(username: string, email: string): Promise<void> {
    await this.sendMessage(
      `<b>✅ Пользователь подтвердил email</b>\n` +
      `Имя: ${username}\n` +
      `email: ${email}`,
    );
  }
}
