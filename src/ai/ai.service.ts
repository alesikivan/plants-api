import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface PlantNameSuggestion {
  recognized: boolean;
  nameRu: string;
  nameEn: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI validation disabled');
      this.openai = null;
    }
  }

  async suggestPlantName(query: string, type: 'genus' | 'variety', genusName?: string): Promise<PlantNameSuggestion | null> {
    if (!this.openai) {
      return null;
    }

    const prompt = type === 'genus'
      ? `
        Пользователь вводит название рода растения (genus): "${query}".

Определи, соответствует ли ввод реальному ботаническому роду растений
(допускаются опечатки, фонетические искажения и разговорные формы).

Алгоритм:
1. Определи латинское каноническое название рода (если существует).
2. Проверь, существует ли ЗАКРЕПЛЁННОЕ в ботанических справочниках
   нормативное русское название этого рода.
3. Если такое русское название существует — используй ТОЛЬКО его,
   даже если оно отличается от пользовательского ввода.

Правила:
- Если род существует:
  - recognized: true
  - nameEn — каноническое латинское название рода
  - nameRu — ТОЛЬКО нормативное русское ботаническое название,
    принятое в научной и справочной литературе
  - НЕ допускается генерация новых русских вариантов
  - НЕ допускается использование пользовательского написания,
    если оно отличается от нормативного
- Если род не существует:
  - recognized: false
  - nameRu и nameEn — пустые строки

Критически важно:
- Русское название должно быть справочным, а не фонетическим.
- Если пользовательский ввод отличается от нормативного названия —
  пользовательский вариант игнорируется.

Ответь СТРОГО в формате JSON (без markdown, без пояснений):
{"recognized": true, "nameRu": "", "nameEn": ""}
      `
      : `Пользователь ищет сорт растения из рода "${genusName}": "${query}".
Название может быть ботаническим (вид/разновидность) или торговым/коммерческим.
- Если "${query}" — реальное название для рода ${genusName}: recognized: true, nameRu и nameEn — ТОЛЬКО название сорта без рода.
  Пример: род Peperomia, запрос "prostrata" → nameRu: "Простата", nameEn: "Prostrata".
- Если не найдено — recognized: false, nameRu и nameEn пустые строки.

Ответь СТРОГО в формате JSON (без markdown, без пояснений):
{"recognized": false, "nameRu": "", "nameEn": ""}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return null;

      const parsed = JSON.parse(content) as PlantNameSuggestion;
      if (typeof parsed.recognized !== 'boolean') return null;

      if (parsed.recognized) {
        parsed.nameRu = parsed.nameRu.charAt(0).toUpperCase() + parsed.nameRu.slice(1);
        parsed.nameEn = parsed.nameEn.charAt(0).toUpperCase() + parsed.nameEn.slice(1);
      }

      return parsed;
    } catch (error) {
      this.logger.error('OpenAI request failed', error);
      return null;
    }
  }
}
