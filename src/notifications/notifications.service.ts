import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';

export interface NotificationActorDto {
  id: string;
  name: string;
  avatar?: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  actor: NotificationActorDto;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    actorId: string,
    data: Record<string, string> = {},
  ): Promise<void> {
    // Don't notify yourself
    if (userId === actorId) return;

    await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      actorId: new Types.ObjectId(actorId),
      data,
    });
  }

  async findAll(userId: string): Promise<NotificationsResponse> {
    const userOid = new Types.ObjectId(userId);

    const [items, unreadCount] = await Promise.all([
      this.notificationModel.aggregate([
        { $match: { userId: userOid } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'users',
            localField: 'actorId',
            foreignField: '_id',
            as: 'actor',
          },
        },
        { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            type: 1,
            actor: {
              id: { $toString: '$actor._id' },
              name: '$actor.name',
              avatar: '$actor.avatar',
            },
            data: 1,
            isRead: 1,
            createdAt: 1,
          },
        },
      ]),
      this.notificationModel.countDocuments({ userId: userOid, isRead: false }),
    ]);

    return { items, unreadCount };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );
  }

  async clearAll(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }
}
