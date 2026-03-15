import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bookmark, BookmarkDocument } from './schemas/bookmark.schema';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { PlantHistory, PlantHistoryDocument } from '../plants/schemas/plant-history.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { FeedPlantItem, FeedHistoryItem, FeedItem, FeedResponse } from '../feed/feed.service';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectModel(Bookmark.name) private bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async toggle(
    userId: string,
    itemType: 'plant' | 'plant_history',
    itemId: string,
  ): Promise<{ bookmarked: boolean }> {
    const userObjId = new Types.ObjectId(userId);
    const itemObjId = new Types.ObjectId(itemId);

    const existing = await this.bookmarkModel.findOne({
      userId: userObjId,
      itemType,
      itemId: itemObjId,
    });

    if (existing) {
      await this.bookmarkModel.deleteOne({ _id: existing._id });
      return { bookmarked: false };
    }

    await this.bookmarkModel.create({
      userId: userObjId,
      itemType,
      itemId: itemObjId,
    });
    return { bookmarked: true };
  }

  private decodeCursor(cursor?: string): { date: Date; id: Types.ObjectId } | null {
    if (!cursor) return null;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
      return { date: new Date(decoded.date), id: new Types.ObjectId(decoded.id) };
    } catch {
      return null;
    }
  }

  private encodeCursor(date: Date, id: Types.ObjectId): string {
    return Buffer.from(
      JSON.stringify({ date: date.toISOString(), id: id.toString() }),
    ).toString('base64url');
  }

  async getSavedFeed(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<FeedResponse> {
    const userObjId = new Types.ObjectId(userId);
    const decoded = this.decodeCursor(cursor);
    const fetchLimit = limit + 1;

    const bookmarkMatch: any = { userId: userObjId };
    if (decoded) {
      bookmarkMatch.$or = [
        { createdAt: { $lt: decoded.date } },
        { createdAt: decoded.date, _id: { $lt: decoded.id } },
      ];
    }

    const bookmarks = await this.bookmarkModel
      .find(bookmarkMatch)
      .sort({ createdAt: -1, _id: -1 })
      .limit(fetchLimit)
      .exec();

    const hasMore = bookmarks.length > limit;
    const pageBookmarks = bookmarks.slice(0, limit);

    if (pageBookmarks.length === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const plantIds = pageBookmarks
      .filter((b) => b.itemType === 'plant')
      .map((b) => b.itemId as Types.ObjectId);
    const historyIds = pageBookmarks
      .filter((b) => b.itemType === 'plant_history')
      .map((b) => b.itemId as Types.ObjectId);

    const [plantItems, historyItems] = await Promise.all([
      plantIds.length > 0 ? this.fetchPlantItemsByIds(plantIds) : Promise.resolve([]),
      historyIds.length > 0 ? this.fetchHistoryItemsByIds(historyIds) : Promise.resolve([]),
    ]);

    // Build lookup map from itemId → FeedItem
    const itemMap = new Map<string, FeedItem>();
    for (const item of plantItems) {
      itemMap.set(`plant_${item._id}`, { ...item, isOwnItem: false, isBookmarked: true });
    }
    for (const item of historyItems) {
      itemMap.set(`plant_history_${item._id}`, { ...item, isOwnItem: false, isBookmarked: true });
    }

    // Reconstruct in bookmark order, skip deleted items
    const orderedItems: FeedItem[] = [];
    for (const bookmark of pageBookmarks) {
      const key = `${bookmark.itemType}_${bookmark.itemId.toString()}`;
      const item = itemMap.get(key);
      if (item) orderedItems.push(item);
    }

    let nextCursor: string | null = null;
    if (hasMore && pageBookmarks.length > 0) {
      const last = pageBookmarks[pageBookmarks.length - 1];
      nextCursor = this.encodeCursor(last.createdAt, last._id as Types.ObjectId);
    }

    return { items: orderedItems, nextCursor, hasMore };
  }

  private async fetchPlantItemsByIds(ids: Types.ObjectId[]): Promise<FeedPlantItem[]> {
    const results = await this.plantModel.aggregate([
      { $match: { _id: { $in: ids }, isArchived: { $ne: true } } },
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $eq: [{ $type: '$userId' }, 'string'] },
              then: { $toObjectId: '$userId' },
              else: '$userId',
            },
          },
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
      { $lookup: { from: 'users', localField: 'userIdObj', foreignField: '_id', as: 'userDoc' } },
      { $unwind: '$userDoc' },
      { $match: { 'userDoc.isBlocked': { $ne: true } } },
      { $lookup: { from: 'genuses', localField: 'genusIdObj', foreignField: '_id', as: 'genus' } },
      { $unwind: { path: '$genus', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'varieties', localField: 'varietyIdObj', foreignField: '_id', as: 'variety' } },
      { $unwind: { path: '$variety', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, createdAt: 1, photo: 1, description: 1,
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
      isOwnItem: false,
      isBookmarked: true,
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

  private async fetchHistoryItemsByIds(ids: Types.ObjectId[]): Promise<FeedHistoryItem[]> {
    const results = await this.plantHistoryModel.aggregate([
      { $match: { _id: { $in: ids } } },
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
      { $lookup: { from: 'users', localField: 'userIdObj', foreignField: '_id', as: 'userDoc' } },
      { $unwind: '$userDoc' },
      { $match: { 'userDoc.isBlocked': { $ne: true } } },
      { $lookup: { from: 'plants', localField: 'plantIdObj', foreignField: '_id', as: 'plantDoc' } },
      { $unwind: '$plantDoc' },
      { $match: { 'plantDoc.isArchived': { $ne: true } } },
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
      { $lookup: { from: 'genuses', localField: 'plantGenusIdObj', foreignField: '_id', as: 'genus' } },
      { $unwind: { path: '$genus', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'varieties', localField: 'plantVarietyIdObj', foreignField: '_id', as: 'variety' } },
      { $unwind: { path: '$variety', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, createdAt: 1, date: 1, comment: 1, photos: 1,
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
      isOwnItem: false,
      isBookmarked: true,
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
