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

  private userLink(userId: string, username: string): string {
    const base = this.configService.get<string>('frontendUrl') || '';
    return `<a href="${base}/profile/${userId}">${username}</a>`;
  }

  private plantLink(plantId: string, genusName: string): string {
    const base = this.configService.get<string>('frontendUrl') || '';
    return `<a href="${base}/plants/${plantId}">${genusName}</a>`;
  }

  private shelfLink(shelfId: string, shelfName: string): string {
    const base = this.configService.get<string>('frontendUrl') || '';
    return `<a href="${base}/shelves/${shelfId}">${shelfName}</a>`;
  }

  async notifyPlantCreated(userId: string, username: string, plantId: string, genusName: string): Promise<void> {
    await this.sendMessage(
      `<b>🌱 Новое растение добавлено</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName)}`,
    );
  }

  async notifyPlantUpdated(userId: string, username: string, plantId: string, genusName: string): Promise<void> {
    await this.sendMessage(
      `<b>✏️ Растение обновлено</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName)}`,
    );
  }

  async notifyHistoryCreated(userId: string, username: string, plantId: string, genusName: string): Promise<void> {
    await this.sendMessage(
      `<b>📖 Добавлена запись в историю растения</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName)}`,
    );
  }

  async notifyHistoryUpdated(userId: string, username: string, plantId: string, genusName: string): Promise<void> {
    await this.sendMessage(
      `<b>✏️ История растения обновлена</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName)}`,
    );
  }

  async notifyShelfCreated(userId: string, username: string, shelfId: string, shelfName: string): Promise<void> {
    await this.sendMessage(
      `<b>🗄 Новая полка создана</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Полка: ${this.shelfLink(shelfId, shelfName)}`,
    );
  }

  async notifyShelfUpdated(userId: string, username: string, shelfId: string, shelfName: string): Promise<void> {
    await this.sendMessage(
      `<b>✏️ Полка обновлена</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Полка: ${this.shelfLink(shelfId, shelfName)}`,
    );
  }
}
