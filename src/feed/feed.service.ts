import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { PlantHistory, PlantHistoryDocument } from '../plants/schemas/plant-history.schema';
import { Follow, FollowDocument } from '../follows/schemas/follow.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface FeedUser {
  _id: string;
  name: string;
  avatar?: string;
}

export interface FeedGenus {
  _id: string;
  nameRu: string;
  nameEn: string;
}

export interface FeedVariety {
  _id: string;
  nameRu: string;
  nameEn: string;
}

export interface FeedPlantItem {
  type: 'plant';
  _id: string;
  createdAt: Date;
  plant: {
    _id: string;
    photo?: string;
    description?: string;
    genusId: FeedGenus;
    varietyId?: FeedVariety;
  };
  user: FeedUser;
}

export interface FeedHistoryItem {
  type: 'plant_history';
  _id: string;
  createdAt: Date;
  historyEntry: {
    _id: string;
    date: string;
    comment: string;
    photos: string[];
  };
  plantMeta: {
    _id: string;
    photo?: string;
    genusId: FeedGenus;
    varietyId?: FeedVariety;
  };
  user: FeedUser;
}

export type FeedItem = FeedPlantItem | FeedHistoryItem;

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private decodeCursor(cursor?: string): { date: Date; id: Types.ObjectId } | null {
    if (!cursor) return null;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      return { date: new Date(decoded.date), id: new Types.ObjectId(decoded.id) };
    } catch {
      return null;
    }
  }

  private encodeCursor(item: FeedItem): string {
    return Buffer.from(
      JSON.stringify({ date: item.createdAt.toISOString(), id: item._id }),
    ).toString('base64url');
  }

  private buildCursorMatch(cursor: { date: Date; id: Types.ObjectId } | null): any {
    if (!cursor) return {};
    return {
      $or: [
        { createdAt: { $lt: cursor.date } },
        { createdAt: cursor.date, _id: { $lt: cursor.id } },
      ],
    };
  }

  async getFeed(
    currentUserId: string,
    mode: 'global' | 'following',
    cursor?: string,
    limit = 20,
  ): Promise<FeedResponse> {
    const decoded = this.decodeCursor(cursor);
    const cursorMatch = this.buildCursorMatch(decoded);

    let followingIds: Types.ObjectId[] | null = null;
    if (mode === 'following') {
      const follows = await this.followModel
        .find({ followerId: new Types.ObjectId(currentUserId) }, { followingId: 1 })
        .exec();
      followingIds = follows.map((f) => f.followingId as Types.ObjectId);
      if (followingIds.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
      }
    }

    const fetchLimit = limit + 1;

    const [plantItems, historyItems] = await Promise.all([
      this.fetchPlantItems(followingIds, cursorMatch, fetchLimit),
      this.fetchHistoryItems(followingIds, cursorMatch, fetchLimit),
    ]);

    const merged = [...plantItems, ...historyItems].sort((a, b) => {
      const diff = b.createdAt.getTime() - a.createdAt.getTime();
      if (diff !== 0) return diff;
      return b._id > a._id ? 1 : -1;
    });

    const sliced = merged.slice(0, limit + 1);
    const hasMore = sliced.length > limit;
    const items = sliced.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = this.encodeCursor(items[items.length - 1]);
    }

    return { items, nextCursor, hasMore };
  }

  private async fetchPlantItems(
    followingIds: Types.ObjectId[] | null,
    cursorMatch: any,
    limit: number,
  ): Promise<FeedPlantItem[]> {
    const initialMatch: any = { isArchived: { $ne: true }, ...cursorMatch };
    if (followingIds) {
      initialMatch.userId = { $in: followingIds };
    }

    const results = await this.plantModel.aggregate([
      { $match: initialMatch },
      // Normalize userId to ObjectId (may be stored as string)
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$userId' }, 'string'] },
              then: { $toObjectId: '$userId' },
              else: '$userId',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
      {
        $match: {
          'userDoc.isBlocked': { $ne: true },
          'userDoc.showPlants': { $ne: false },
        },
      },
      // Handle genusId stored as either string or ObjectId
      {
        $addFields: {
          genusIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$genusId' }, 'string'] },
              then: { $toObjectId: '$genusId' },
              else: '$genusId',
            },
          },
          varietyIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$varietyId' }, 'string'] },
              then: { $toObjectId: '$varietyId' },
              else: '$varietyId',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'genuses',
          localField: 'genusIdObj',
          foreignField: '_id',
          as: 'genus',
        },
      },
      { $unwind: { path: '$genus', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'varieties',
          localField: 'varietyIdObj',
          foreignField: '_id',
          as: 'variety',
        },
      },
      { $unwind: { path: '$variety', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          photo: 1,
          description: 1,
          genus: { _id: 1, nameRu: 1, nameEn: 1 },
          variety: { _id: 1, nameRu: 1, nameEn: 1 },
          userDoc: { _id: 1, name: 1, avatar: 1 },
        },
      },
    ]);

    return results.map((r) => ({
      type: 'plant' as const,
      _id: r._id.toString(),
      createdAt: r.createdAt,
      plant: {
        _id: r._id.toString(),
        photo: r.photo,
        description: r.description,
        genusId: r.genus
          ? { _id: r.genus._id.toString(), nameRu: r.genus.nameRu, nameEn: r.genus.nameEn }
          : { _id: '', nameRu: 'Неизвестный', nameEn: 'Unknown' },
        varietyId: r.variety
          ? { _id: r.variety._id.toString(), nameRu: r.variety.nameRu, nameEn: r.variety.nameEn }
          : undefined,
      },
      user: {
        _id: r.userDoc._id.toString(),
        name: r.userDoc.name,
        avatar: r.userDoc.avatar,
      },
    }));
  }

  private async fetchHistoryItems(
    followingIds: Types.ObjectId[] | null,
    cursorMatch: any,
    limit: number,
  ): Promise<FeedHistoryItem[]> {
    const initialMatch: any = { ...cursorMatch };
    if (followingIds) {
      initialMatch.userId = { $in: followingIds };
    }

    const results = await this.plantHistoryModel.aggregate([
      { $match: initialMatch },
      // Normalize userId and plantId to ObjectId (may be stored as string)
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$userId' }, 'string'] },
              then: { $toObjectId: '$userId' },
              else: '$userId',
            },
          },
          plantIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$plantId' }, 'string'] },
              then: { $toObjectId: '$plantId' },
              else: '$plantId',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
      {
        $match: {
          'userDoc.isBlocked': { $ne: true },
          'userDoc.showPlants': { $ne: false },
          'userDoc.showPlantHistory': { $ne: false },
        },
      },
      {
        $lookup: {
          from: 'plants',
          localField: 'plantIdObj',
          foreignField: '_id',
          as: 'plantDoc',
        },
      },
      { $unwind: '$plantDoc' },
      { $match: { 'plantDoc.isArchived': { $ne: true } } },
      // Handle genusId/varietyId stored as string or ObjectId in plant doc
      {
        $addFields: {
          plantGenusIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$plantDoc.genusId' }, 'string'] },
              then: { $toObjectId: '$plantDoc.genusId' },
              else: '$plantDoc.genusId',
            },
          },
          plantVarietyIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$plantDoc.varietyId' }, 'string'] },
              then: { $toObjectId: '$plantDoc.varietyId' },
              else: '$plantDoc.varietyId',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'genuses',
          localField: 'plantGenusIdObj',
          foreignField: '_id',
          as: 'genus',
        },
      },
      { $unwind: { path: '$genus', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'varieties',
          localField: 'plantVarietyIdObj',
          foreignField: '_id',
          as: 'variety',
        },
      },
      { $unwind: { path: '$variety', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          date: 1,
          comment: 1,
          photos: 1,
          plantDoc: { _id: 1, photo: 1 },
          genus: { _id: 1, nameRu: 1, nameEn: 1 },
          variety: { _id: 1, nameRu: 1, nameEn: 1 },
          userDoc: { _id: 1, name: 1, avatar: 1 },
        },
      },
    ]);

    return results.map((r) => ({
      type: 'plant_history' as const,
      _id: r._id.toString(),
      createdAt: r.createdAt,
      historyEntry: {
        _id: r._id.toString(),
        date: r.date,
        comment: r.comment,
        photos: r.photos || [],
      },
      plantMeta: {
        _id: r.plantDoc._id.toString(),
        photo: r.plantDoc.photo,
        genusId: r.genus
          ? { _id: r.genus._id.toString(), nameRu: r.genus.nameRu, nameEn: r.genus.nameEn }
          : { _id: '', nameRu: 'Неизвестный', nameEn: 'Unknown' },
        varietyId: r.variety
          ? { _id: r.variety._id.toString(), nameRu: r.variety.nameRu, nameEn: r.variety.nameEn }
          : undefined,
      },
      user: {
        _id: r.userDoc._id.toString(),
        name: r.userDoc.name,
        avatar: r.userDoc.avatar,
      },
    }));
  }
}
