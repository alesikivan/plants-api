import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiRecognitionLog, AiRecognitionLogDocument } from './schemas/ai-recognition-log.schema';

export interface LogAiRecognitionDto {
  userId?: string;
  userName?: string;
  type: 'genus' | 'variety';
  query: string;
  recognized: boolean;
  resultNameRu?: string;
  resultNameEn?: string;
  genusId?: string;
  genusNameRu?: string;
  genusNameEn?: string;
}

export interface AiRecognitionStatsResponse {
  total: number;
  recognized: number;
  notRecognized: number;
  recognizedPercent: number;
  notRecognizedPercent: number;
  byType: {
    genus: { total: number; recognized: number; notRecognized: number; recognizedPercent: number };
    variety: { total: number; recognized: number; notRecognized: number; recognizedPercent: number };
  };
  period: {
    today: number;
    last3days: number;
    lastWeek: number;
    lastMonth: number;
  };
}

export interface AiRecognitionListResponse {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  nextCursor?: string; // _id of last item for cursor-based pagination
}

@Injectable()
export class AiRecognitionLogService {
  constructor(
    @InjectModel(AiRecognitionLog.name)
    private logModel: Model<AiRecognitionLogDocument>,
  ) {}

  async log(dto: LogAiRecognitionDto): Promise<void> {
    try {
      await this.logModel.create({
        userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
        userName: dto.userName,
        type: dto.type,
        query: dto.query,
        recognized: dto.recognized,
        resultNameRu: dto.resultNameRu ?? '',
        resultNameEn: dto.resultNameEn ?? '',
        genusId: dto.genusId ? new Types.ObjectId(dto.genusId) : undefined,
        genusNameRu: dto.genusNameRu,
        genusNameEn: dto.genusNameEn,
      });
    } catch (err) {
      // Silent fail — do not break main flow
      console.error('AiRecognitionLog: failed to save', err);
    }
  }

  async getStats(): Promise<AiRecognitionStatsResponse> {
    const now = new Date();
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const last3days = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      recognized,
      genusTotal,
      genusRecognized,
      varietyTotal,
      varietyRecognized,
      periodToday,
      periodLast3days,
      periodLastWeek,
      periodLastMonth,
    ] = await Promise.all([
      this.logModel.countDocuments(),
      this.logModel.countDocuments({ recognized: true }),
      this.logModel.countDocuments({ type: 'genus' }),
      this.logModel.countDocuments({ type: 'genus', recognized: true }),
      this.logModel.countDocuments({ type: 'variety' }),
      this.logModel.countDocuments({ type: 'variety', recognized: true }),
      this.logModel.countDocuments({ createdAt: { $gte: today } }),
      this.logModel.countDocuments({ createdAt: { $gte: last3days } }),
      this.logModel.countDocuments({ createdAt: { $gte: lastWeek } }),
      this.logModel.countDocuments({ createdAt: { $gte: lastMonth } }),
    ]);

    const notRecognized = total - recognized;
    const pct = (part: number, all: number) =>
      all === 0 ? 0 : Math.round((part / all) * 100);

    return {
      total,
      recognized,
      notRecognized,
      recognizedPercent: pct(recognized, total),
      notRecognizedPercent: pct(notRecognized, total),
      byType: {
        genus: {
          total: genusTotal,
          recognized: genusRecognized,
          notRecognized: genusTotal - genusRecognized,
          recognizedPercent: pct(genusRecognized, genusTotal),
        },
        variety: {
          total: varietyTotal,
          recognized: varietyRecognized,
          notRecognized: varietyTotal - varietyRecognized,
          recognizedPercent: pct(varietyRecognized, varietyTotal),
        },
      },
      period: {
        today: periodToday,
        last3days: periodLast3days,
        lastWeek: periodLastWeek,
        lastMonth: periodLastMonth,
      },
    };
  }

  async getList(
    page = 1,
    limit = 20,
    type?: 'genus' | 'variety',
    recognized?: boolean,
    cursor?: string, // _id of last seen item (cursor-based, avoids skip slowness)
  ): Promise<AiRecognitionListResponse> {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (recognized !== undefined) filter.recognized = recognized;

    // Cursor-based pagination: if cursor provided, fetch docs with _id < cursor
    // (since we sort desc by createdAt, newer _ids are larger ObjectIds)
    if (cursor) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const [items, total] = await Promise.all([
      this.logModel
        .find(filter)
        .sort({ _id: -1 }) // _id desc == createdAt desc for ObjectId (monotonically increasing)
        .limit(limit)
        .lean<Record<string, unknown>[]>()
        .exec(),
      // Count without cursor filter for accurate total/pages
      this.logModel.countDocuments(
        (() => {
          const c: Record<string, unknown> = {};
          if (type) c.type = type;
          if (recognized !== undefined) c.recognized = recognized;
          return c;
        })(),
      ),
    ]);

    const lastItem = items[items.length - 1];
    const nextCursor =
      items.length === limit && lastItem
        ? String((lastItem as Record<string, unknown>)._id)
        : undefined;

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      nextCursor,
    };
  }
}
