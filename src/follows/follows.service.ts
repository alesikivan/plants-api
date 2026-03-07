import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Follow, FollowDocument } from './schemas/follow.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface FollowUserDto {
  id: string;
  name: string;
  avatar?: string;
}

export interface FollowListDto {
  items: FollowUserDto[];
  total: number;
}

export interface FollowStatsDto {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('Нельзя подписаться на самого себя');
    }

    const targetUser = await this.userModel.findById(followingId).exec();
    if (!targetUser || targetUser.isBlocked) {
      throw new NotFoundException('Пользователь не найден');
    }

    try {
      await this.followModel.create({
        followerId: new Types.ObjectId(followerId),
        followingId: new Types.ObjectId(followingId),
      });
    } catch (err) {
      if (err.code === 11000) {
        // Already following — silently succeed
        return;
      }
      throw err;
    }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.followModel.deleteOne({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    }).exec();
  }

  async getStats(userId: string, requesterId?: string): Promise<FollowStatsDto> {
    const userOid = new Types.ObjectId(userId);
    const [followersCount, followingCount, followDoc] = await Promise.all([
      this.followModel.countDocuments({ followingId: userOid }).exec(),
      this.followModel.countDocuments({ followerId: userOid }).exec(),
      requesterId && requesterId !== userId
        ? this.followModel.exists({
            followerId: new Types.ObjectId(requesterId),
            followingId: userOid,
          }).exec()
        : Promise.resolve(null),
    ]);

    return {
      followersCount,
      followingCount,
      isFollowing: requesterId && requesterId !== userId ? !!followDoc : null,
    };
  }

  private async paginateFollows(
    matchField: 'followingId' | 'followerId',
    lookupField: 'followerId' | 'followingId',
    userId: string,
    q?: string,
    page = 1,
    limit = 20,
  ): Promise<FollowListDto> {
    const userMatch: Record<string, any> = { 'user.isBlocked': { $ne: true } };
    if (q?.trim()) {
      userMatch['user.name'] = { $regex: q.trim(), $options: 'i' };
    }

    const result = await this.followModel.aggregate([
      { $match: { [matchField]: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'users',
          localField: lookupField,
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $match: userMatch },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: { $toString: '$user._id' },
                name: '$user.name',
                avatar: '$user.avatar',
              },
            },
          ],
          totalArr: [{ $count: 'count' }],
        },
      },
    ]);

    const { items, totalArr } = result[0] ?? { items: [], totalArr: [] };
    return { items, total: totalArr[0]?.count ?? 0 };
  }

  async getFollowers(userId: string, q?: string, page = 1, limit = 20): Promise<FollowListDto> {
    return this.paginateFollows('followingId', 'followerId', userId, q, page, limit);
  }

  async getFollowing(userId: string, q?: string, page = 1, limit = 20): Promise<FollowListDto> {
    return this.paginateFollows('followerId', 'followingId', userId, q, page, limit);
  }

  async removeAllForUser(userId: string): Promise<void> {
    const oid = new Types.ObjectId(userId);
    await this.followModel.deleteMany({
      $or: [{ followerId: oid }, { followingId: oid }],
    }).exec();
  }
}
