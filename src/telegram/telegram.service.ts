import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface TelegramTarget {
  chatId: string;
  /** message_thread_id for forum-style groups (Topics) */
  threadId?: string;
}

/** Topics of the community group */
export type CommunityTopic = 'general' | 'plants' | 'history';
export const COMMUNITY_TOPICS: CommunityTopic[] = ['general', 'plants', 'history'];

export interface TelegramPhotoInput {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  /** Community group targets: plants and history may go to different topics (threads) */
  private readonly communityPlantsTarget: TelegramTarget | undefined;
  private readonly communityHistoryTarget: TelegramTarget | undefined;
  /** Base URL for links in community posts */
  private readonly communitySiteUrl: string;
  private static readonly COMMUNITY_BRAND = 'plantsheep.com';

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
    this.chatId = this.configService.get<string>('telegram.chatId');

    const communityChatId = this.configService.get<string>('telegram.communityChatId');
    const plantsThreadId = this.configService.get<string>('telegram.communityPlantsThreadId');
    const historyThreadId = this.configService.get<string>('telegram.communityHistoryThreadId');
    this.communityPlantsTarget = communityChatId
      ? { chatId: communityChatId, threadId: plantsThreadId || undefined }
      : undefined;
    this.communityHistoryTarget = communityChatId
      ? { chatId: communityChatId, threadId: historyThreadId || undefined }
      : undefined;
    this.communitySiteUrl = (
      this.configService.get<string>('telegram.communitySiteUrl') ||
      this.configService.get<string>('frontendUrl') ||
      ''
    ).replace(/\/$/, '');
  }

  /** Target chat resolution: explicit target, else admin chat from config */
  private resolveTarget(target?: TelegramTarget): TelegramTarget | undefined {
    if (target) return target;
    return this.chatId ? { chatId: this.chatId } : undefined;
  }

  private appendTarget(form: FormData, target: TelegramTarget): void {
    form.append('chat_id', target.chatId);
    if (target.threadId) form.append('message_thread_id', target.threadId);
  }

  /** Escape user-provided text for Telegram HTML parse mode */
  static escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
  }

  async sendMessage(text: string, target?: TelegramTarget): Promise<void> {
    const to = this.resolveTarget(target);
    if (!this.botToken || !to) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: to.chatId,
          ...(to.threadId ? { message_thread_id: to.threadId } : {}),
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

  /**
   * Отправляет локальный файл-изображение с подписью через Telegram sendPhoto (multipart upload).
   * Если файла нет или произошла ошибка — откатывается на обычное текстовое сообщение (caption).
   */
  async sendPhoto(photoPath: string, caption: string, target?: TelegramTarget): Promise<void> {
    const to = this.resolveTarget(target);
    if (!this.botToken || !to) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    if (!photoPath || !fs.existsSync(photoPath)) {
      await this.sendMessage(caption, to);
      return;
    }

    const buffer = await fs.promises.readFile(photoPath);
    await this.sendPhotoBuffer({ buffer, filename: path.basename(photoPath) }, caption, to);
  }

  /** Отправляет одно изображение из памяти (multipart). При ошибке — фолбэк на текст. */
  async sendPhotoBuffer(photo: TelegramPhotoInput, caption: string, target?: TelegramTarget): Promise<void> {
    const to = this.resolveTarget(target);
    if (!this.botToken || !to) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    try {
      const form = new FormData();
      this.appendTarget(form, to);
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      form.append('photo', new Blob([new Uint8Array(photo.buffer)]), photo.filename);

      const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
      const response = await fetch(url, { method: 'POST', body: form });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram sendPhoto error: ${error}`);
        // Фолбэк на текст, чтобы уведомление хотя бы дошло
        await this.sendMessage(caption, to);
      }
    } catch (err) {
      this.logger.error('Failed to send Telegram photo notification', err);
      await this.sendMessage(caption, to);
    }
  }

  /**
   * Отправляет несколько локальных изображений одним альбомом через sendMediaGroup.
   * Подпись вешается на первое фото. Telegram принимает максимум 10 файлов за раз.
   * Фолбэки: одно фото -> sendPhoto, ошибка/нет файлов -> sendMessage.
   */
  async sendMediaGroup(photoPaths: string[], caption: string, target?: TelegramTarget): Promise<void> {
    const to = this.resolveTarget(target);
    if (!this.botToken || !to) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    const existing = (photoPaths || []).filter(p => p && fs.existsSync(p)).slice(0, 10);
    const photos: TelegramPhotoInput[] = await Promise.all(
      existing.map(async photoPath => ({
        buffer: await fs.promises.readFile(photoPath),
        filename: path.basename(photoPath),
      })),
    );
    await this.sendMediaGroupBuffers(photos, caption, to);
  }

  /**
   * Отправляет несколько изображений из памяти одним альбомом (sendMediaGroup, максимум 10).
   * Подпись вешается на первое фото. Фолбэки: одно фото -> sendPhotoBuffer, нет фото -> sendMessage.
   */
  async sendMediaGroupBuffers(photosInput: TelegramPhotoInput[], caption: string, target?: TelegramTarget): Promise<void> {
    const to = this.resolveTarget(target);
    if (!this.botToken || !to) {
      this.logger.warn('Telegram not configured, skipping notification');
      return;
    }

    const photos = (photosInput || []).slice(0, 10);

    if (photos.length === 0) {
      await this.sendMessage(caption, to);
      return;
    }

    if (photos.length === 1) {
      await this.sendPhotoBuffer(photos[0], caption, to);
      return;
    }

    try {
      const form = new FormData();
      this.appendTarget(form, to);

      const media = photos.map((photo, index) => {
        const field = `photo${index}`;
        form.append(field, new Blob([new Uint8Array(photo.buffer)]), photo.filename);
        return index === 0
          ? { type: 'photo', media: `attach://${field}`, caption, parse_mode: 'HTML' }
          : { type: 'photo', media: `attach://${field}` };
      });

      form.append('media', JSON.stringify(media));

      const url = `https://api.telegram.org/bot${this.botToken}/sendMediaGroup`;
      const response = await fetch(url, { method: 'POST', body: form });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram sendMediaGroup error: ${error}`);
        // Фолбэк: хотя бы первое фото с подписью
        await this.sendPhotoBuffer(photos[0], caption, to);
      }
    } catch (err) {
      this.logger.error('Failed to send Telegram media group notification', err);
      await this.sendPhotoBuffer(photos[0], caption, to);
    }
  }

  // ===================== Community (public group) publishing =====================

  get isCommunityConfigured(): boolean {
    return !!this.botToken && !!this.communityPlantsTarget;
  }

  /** Resolve a community topic to a chat/thread target (general = chat without thread) */
  getCommunityTarget(topic: CommunityTopic): TelegramTarget | undefined {
    const chatId = this.communityPlantsTarget?.chatId;
    if (!chatId) return undefined;
    switch (topic) {
      case 'plants':
        return this.communityPlantsTarget;
      case 'history':
        return this.communityHistoryTarget;
      default:
        return { chatId };
    }
  }

  /**
   * Ручное сообщение от имени бота в сообщество (админка): plain text + до 10 фото, в выбранные темы.
   * Текст экранируется (форматирование не поддерживается). Возвращает число отправленных сообщений/альбомов.
   */
  async broadcastToCommunity(params: {
    text?: string;
    photos?: TelegramPhotoInput[];
    topics: CommunityTopic[];
  }): Promise<{ sent: number }> {
    if (!this.isCommunityConfigured) {
      this.logger.warn('Telegram community not configured, skipping broadcast');
      return { sent: 0 };
    }

    const text = TelegramService.escapeHtml((params.text || '').trim());
    const photos = (params.photos || []).slice(0, 10);
    if (!text && photos.length === 0) return { sent: 0 };

    // Dedupe targets (e.g. topic thread ids not configured → same chat)
    const seen = new Set<string>();
    const targets: TelegramTarget[] = [];
    for (const topic of params.topics) {
      const target = this.getCommunityTarget(topic);
      if (!target) continue;
      const key = `${target.chatId}:${target.threadId || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }

    let sent = 0;
    for (const target of targets) {
      if (photos.length > 0) {
        await this.sendMediaGroupBuffers(photos, this.truncate(text, 1024), target);
      } else {
        await this.sendMessage(this.truncate(text, 4096), target);
      }
      sent++;
    }
    return { sent };
  }

  /**
   * Публикация нового растения пользователя в Telegram-сообщество.
   * С фото — sendPhoto с подписью, без фото — текст со ссылкой на растение.
   */
  async publishPlantToCommunity(params: {
    userId: string;
    username: string;
    plantId: string;
    genusName: string;
    varietyName?: string;
    description?: string;
    photoFilename?: string;
  }): Promise<void> {
    if (!this.isCommunityConfigured) {
      this.logger.warn('Telegram community not configured, skipping publish');
      return;
    }

    const esc = TelegramService.escapeHtml;
    const plantTitle = params.varietyName
      ? `${esc(params.genusName)} · ${esc(params.varietyName)}`
      : esc(params.genusName);
    const description = params.description?.trim()
      ? `\n\n${esc(this.truncate(params.description.trim(), 400))}`
      : '';

    const site = this.communitySiteUrl;
    const caption =
      `🌱 <b>${this.userLink(params.userId, esc(params.username), site)}</b> добавил(а) новое растение\n` +
      `Растение: ${this.plantLink(params.plantId, plantTitle, params.userId, site)}` +
      description +
      this.communityFooter();

    if (params.photoFilename) {
      await this.sendPhoto(`./uploads/plants/${params.photoFilename}`, this.truncate(caption, 1024), this.communityPlantsTarget);
    } else {
      await this.sendMessage(this.truncate(caption, 4096), this.communityPlantsTarget);
    }
  }

  /**
   * Публикация новой записи истории растения в Telegram-сообщество.
   * С фото — альбом (sendMediaGroup), без фото — текст со ссылкой на растение.
   */
  async publishHistoryToCommunity(params: {
    userId: string;
    username: string;
    plantId: string;
    genusName: string;
    varietyName?: string;
    comment?: string;
    photoFilenames?: string[];
  }): Promise<void> {
    if (!this.isCommunityConfigured) {
      this.logger.warn('Telegram community not configured, skipping publish');
      return;
    }

    const esc = TelegramService.escapeHtml;
    const plantTitle = params.varietyName
      ? `${esc(params.genusName)} · ${esc(params.varietyName)}`
      : esc(params.genusName);
    const comment = params.comment?.trim()
      ? `\n\n${esc(this.truncate(params.comment.trim(), 400))}`
      : '';

    const site = this.communitySiteUrl;
    const caption =
      `📖 <b>${this.userLink(params.userId, esc(params.username), site)}</b> — новая запись в истории растения\n` +
      `Растение: ${this.plantLink(params.plantId, plantTitle, params.userId, site)}` +
      comment +
      this.communityFooter();

    const photos = params.photoFilenames || [];
    if (photos.length > 0) {
      await this.sendMediaGroup(photos.map(p => `./uploads/plant-history/${p}`), this.truncate(caption, 1024), this.communityHistoryTarget);
    } else {
      await this.sendMessage(this.truncate(caption, 4096), this.communityHistoryTarget);
    }
  }

  async notifyUserRegistered(username: string, email: string, userAgent = ''): Promise<void> {
    await this.sendMessage(
      `<b>👤 Новый пользователь зарегистрировался</b>\n` +
      `Имя: ${username}\n` +
      `email: ${email}\n` +
      (userAgent ? `User-Agent: <code>${userAgent}</code>` : ''),
    );
  }

  async notifyEmailVerified(username: string, email: string): Promise<void> {
    await this.sendMessage(
      `<b>✅ Пользователь подтвердил email</b>\n` +
      `Имя: ${username}\n` +
      `email: ${email}`,
    );
  }

  private userLink(userId: string, username: string, base = this.configService.get<string>('frontendUrl') || ''): string {
    return `<a href="${base}/profile/${userId}">${username}</a>`;
  }

  private plantLink(plantId: string, genusName: string, userId: string, base = this.configService.get<string>('frontendUrl') || ''): string {
    return `<a href="${base}/profile/${userId}/plants/${plantId}">${genusName}</a>`;
  }

  private communityFooter(): string {
    return `\n\n<i>Опубликовано из <a href="${this.communitySiteUrl}">${TelegramService.COMMUNITY_BRAND}</a></i>`;
  }

  private shelfLink(shelfId: string, shelfName: string, userId: string): string {
    const base = this.configService.get<string>('frontendUrl') || '';
    return `<a href="${base}/profile/${userId}/shelves/${shelfId}">${shelfName}</a>`;
  }

  async notifyPlantCreated(userId: string, username: string, plantId: string, genusName: string, withHistory = false, photoFilename?: string): Promise<void> {
    const title = withHistory
      ? '🌱📖 Новое растение добавлено сразу с историей'
      : '🌱 Новое растение добавлено';
    const caption =
      `<b>${title}</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName, userId)}`;

    if (photoFilename) {
      await this.sendPhoto(`./uploads/plants/${photoFilename}`, caption);
    } else {
      await this.sendMessage(caption);
    }
  }

  async notifyPlantUpdated(userId: string, username: string, plantId: string, genusName: string): Promise<void> {
    await this.sendMessage(
      `<b>✏️ Растение обновлено</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName, userId)}`,
    );
  }

  async notifyHistoryCreated(userId: string, username: string, plantId: string, genusName: string, photoFilenames: string[] = []): Promise<void> {
    const caption =
      `<b>📖 Добавлена запись в историю растения</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName, userId)}`;

    if (photoFilenames.length > 0) {
      await this.sendMediaGroup(photoFilenames.map(p => `./uploads/plant-history/${p}`), caption);
    } else {
      await this.sendMessage(caption);
    }
  }

  async notifyHistoryUpdated(userId: string, username: string, plantId: string, genusName: string, photoFilenames: string[] = []): Promise<void> {
    const caption =
      `<b>✏️ История растения обновлена</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${this.plantLink(plantId, genusName, userId)}`;

    if (photoFilenames.length > 0) {
      await this.sendMediaGroup(photoFilenames.map(p => `./uploads/plant-history/${p}`), caption);
    } else {
      await this.sendMessage(caption);
    }
  }

  async notifyShelfCreated(userId: string, username: string, shelfId: string, shelfName: string, photoFilename?: string): Promise<void> {
    const caption =
      `<b>🗄 Новая полка создана</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Полка: ${this.shelfLink(shelfId, shelfName, userId)}`;

    if (photoFilename) {
      await this.sendPhoto(`./uploads/shelves/${photoFilename}`, caption);
    } else {
      await this.sendMessage(caption);
    }
  }

  async notifyShelfUpdated(userId: string, username: string, shelfId: string, shelfName: string, photoFilename?: string): Promise<void> {
    const caption =
      `<b>✏️ Полка обновлена</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Полка: ${this.shelfLink(shelfId, shelfName, userId)}`;

    if (photoFilename) {
      await this.sendPhoto(`./uploads/shelves/${photoFilename}`, caption);
    } else {
      await this.sendMessage(caption);
    }
  }

  async notifyWishlistCreated(userId: string, username: string, wishlistId: string, genusName: string): Promise<void> {
    const base = this.configService.get<string>('frontendUrl') || '';
    const link = `<a href="${base}/dashboard?wishlistId=${wishlistId}">${genusName}</a>`;
    await this.sendMessage(
      `<b>🌿 Новое желание добавлено</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${link}`,
    );
  }

  async notifyWishlistUpdated(userId: string, username: string, wishlistId: string, genusName: string): Promise<void> {
    const base = this.configService.get<string>('frontendUrl') || '';
    const link = `<a href="${base}/dashboard?wishlistId=${wishlistId}">${genusName}</a>`;
    await this.sendMessage(
      `<b>✏️ Желание обновлено</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `Растение: ${link}`,
    );
  }

  async notifyNameChanged(userId: string, oldName: string, newName: string): Promise<void> {
    await this.sendMessage(
      `<b>✏️ Пользователь сменил имя</b>\n` +
      `Профиль: ${this.userLink(userId, newName)}\n` +
      `Было: <code>${oldName}</code>\n` +
      `Стало: <code>${newName}</code>`,
    );
  }

  async notifyAiRecognition(
    userId: string, username: string,
    type: 'genus' | 'variety',
    query: string,
    suggestion: { nameRu: string; nameEn: string },
    genus?: { nameRu: string; nameEn: string }
  ): Promise<void> {
    const emoji = type === 'genus' ? '🔍' : '🔬';
    const typeLabel = type === 'genus' ? 'Род' : 'Сорт';
    const genusLine = genus ? `Род: ${genus.nameRu} / ${genus.nameEn}\n` : '';
    await this.sendMessage(
      `<b>${emoji} ИИ распознавание - ${typeLabel}</b>\n` +
      `Пользователь: ${this.userLink(userId, username)}\n` +
      `${genusLine}` +
      `Запрос: <code>${query}</code>\n` +
      `Результат: ${suggestion.nameRu} / ${suggestion.nameEn}`,
    );
  }

  async notifyWishlistSavedFromFeed(
    currentUserId: string,
    currentUsername: string,
    sourceUserId: string,
    sourceUsername: string,
    wishlistId: string,
    genusName: string
  ): Promise<void> {
    // Notification to admin/general chat
    const base = this.configService.get<string>('frontendUrl') || '';
    const link = `<a href="${base}/dashboard?wishlistId=${wishlistId}">${genusName}</a>`;
    await this.sendMessage(
      `<b>💾 Растение сохранено в wishlist</b>\n` +
      `Сохранил: ${this.userLink(currentUserId, currentUsername)}\n` +
      `Растение: ${link}\n` +
      `Владелец: ${this.userLink(sourceUserId, sourceUsername)}`,
    );
  }
}
