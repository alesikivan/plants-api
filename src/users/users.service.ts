import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileWithStatsDto } from './dto/user-profile-with-stats.dto';
import { SeoSitemapItemDto, SeoSitemapUserDto } from './dto/seo-sitemap.dto';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';
import { PlantHistory, PlantHistoryDocument } from '../plants/schemas/plant-history.schema';
import { Wishlist, WishlistDocument } from '../wishlist/schemas/wishlist.schema';
import { Follow, FollowDocument } from '../follows/schemas/follow.schema';
import { Bookmark, BookmarkDocument } from '../bookmarks/schemas/bookmark.schema';
import { Role } from '../common/enums/role.enum';
import { compressImage } from '../common/utils/compress-image';
import { FILE_UPLOAD_CONFIG } from '../config/file-upload.config';
import { I18nService } from 'nestjs-i18n';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(Bookmark.name) private bookmarkModel: Model<BookmarkDocument>,
    private i18n: I18nService,
    private telegramService: TelegramService,
  ) {}

  private validateSocialLinks(socialLinks: any[]): void {
    if (!Array.isArray(socialLinks)) {
      throw new BadRequestException('Social links must be an array');
    }

    for (const link of socialLinks) {
      if (!link.type || !link.value) {
        throw new BadRequestException('Each social link must have type and value');
      }

      if (typeof link.type !== 'string' || typeof link.value !== 'string') {
        throw new BadRequestException('Social link type and value must be strings');
      }

      if (typeof link.isPublic !== 'boolean') {
        throw new BadRequestException('Social link isPublic must be a boolean');
      }

      // Basic validation per type
      if (link.type === 'telegram' && !this.isValidTelegram(link.value)) {
        throw new BadRequestException('Invalid Telegram handle');
      }
      if (link.type === 'instagram' && !this.isValidInstagram(link.value)) {
        throw new BadRequestException('Invalid Instagram handle');
      }
      if (link.type === 'phone' && !this.isValidPhone(link.value)) {
        throw new BadRequestException('Invalid phone number');
      }
    }
  }

  private isValidTelegram(value: string): boolean {
    return /^@?[a-zA-Z0-9_]{5,32}$/.test(value) || /^https?:\/\/(t\.me|telegram\.me)\/[a-zA-Z0-9_]{5,32}/.test(value);
  }

  private isValidInstagram(value: string): boolean {
    return /^@?[a-zA-Z0-9_.]{1,30}$/.test(value) || /^https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]{1,30}/.test(value);
  }

  private isValidPhone(value: string): boolean {
    // Simple E.164 format or basic phone formats
    return /^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s\-()]/g, ''));
  }

  private filterPublicSocialLinks(socialLinks: any[]): any[] {
    if (!socialLinks) return [];
    return socialLinks.filter(link => link.isPublic === true);
  }

  private canBypassPrivacy(targetUser: UserDocument, requester?: UserDocument | null): boolean {
    if (!requester) {
      this.logger.debug(`canBypassPrivacy: no requester → false`);
      return false;
    }

    if (requester.role === Role.ADMIN) {
      this.logger.debug(`canBypassPrivacy: requester ${requester._id} is ADMIN → true`);
      return true;
    }

    const isSelf = requester._id?.toString() === targetUser._id.toString();
    this.logger.debug(`canBypassPrivacy: requester=${requester._id} target=${targetUser._id} isSelf=${isSelf}`);
    return isSelf;
  }

  async create(
    createUserDto: CreateUserDto,
    skipVerification = false,
  ): Promise<{ user: UserDocument; verificationToken: string | null }> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException(await this.i18n.translate('auth.errors.userExistsByEmail'));
    }

    const existingName = await this.userModel.findOne({ name: createUserDto.name });
    if (existingName) {
      throw new ConflictException(await this.i18n.translate('auth.errors.userExistsByName'));
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    let verificationToken: string | null = null;
    let verificationFields = {};

    if (!skipVerification) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      verificationFields = {
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      ...verificationFields,
    });

    const saved = await user.save();
    return { user: saved, verificationToken };
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
  }

  async setNewVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.userModel.findByIdAndUpdate(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return token;
  }

  async setPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).exec();
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashedRefreshToken });
  }

  async findAll(): Promise<UserDocument[]> {
    // Admin listing should include blocked users as well.
    return this.userModel.find().sort({ createdAt: 1 }).exec();
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    if (updateUserDto.socialLinks) {
      this.validateSocialLinks(updateUserDto.socialLinks);
    }

    if (updateUserDto.name) {
      const existing = await this.userModel.findOne({ name: updateUserDto.name, _id: { $ne: new Types.ObjectId(userId) } }).exec();
      if (existing) {
        throw new ConflictException(await this.i18n.translate('auth.errors.userExistsByName'));
      }
    }

    const currentUser = await this.userModel.findById(userId).exec();
    if (!currentUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (updateUserDto.showPlants === false) {
      updateUserDto.showPlantHistory = false;
    }

    const oldName = currentUser.name;

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      updateUserDto,
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (updateUserDto.name && updateUserDto.name !== oldName) {
      this.telegramService.notifyNameChanged(userId, oldName, user.name).catch(() => {});
    }

    const hidingPlants = updateUserDto.showPlants === false && currentUser.showPlants !== false;
    const hidingHistory = updateUserDto.showPlantHistory === false && currentUser.showPlantHistory !== false;

    if (hidingPlants || hidingHistory) {
      this.deleteOwnerBookmarks(userId, hidingPlants, hidingPlants || hidingHistory).catch(() => {});
    }

    return user;
  }

  private async deleteOwnerBookmarks(userId: string, includePlants: boolean, includeHistory: boolean): Promise<void> {
    const ownerObjId = new Types.ObjectId(userId);

    if (includePlants) {
      const plants = await this.plantModel.find({ userId: ownerObjId }).select('_id').lean();
      const plantIds = plants.map((p) => p._id);
      if (plantIds.length > 0) {
        await this.bookmarkModel.deleteMany({ itemType: 'plant', itemId: { $in: plantIds } });
      }
    }

    if (includeHistory) {
      const histories = await this.plantHistoryModel.find({ userId: ownerObjId }).select('_id').lean();
      const historyIds = histories.map((h) => h._id);
      if (historyIds.length > 0) {
        await this.bookmarkModel.deleteMany({ itemType: 'plant_history', itemId: { $in: historyIds } });
      }
    }
  }

  async searchUsers(query?: string, sort?: string): Promise<UserProfileWithStatsDto[]> {
    let filter: Record<string, any> = { isBlocked: { $ne: true } };

    if (query && query.trim()) {
      filter = {
        ...filter,
        name: { $regex: query.trim(), $options: 'i' }
      };
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const mongoSort = sortOptions[sort] || { createdAt: -1 };

    const users = await this.userModel.find(filter).sort(mongoSort).exec();

    // Получаем статистику для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalPlants = await this.plantModel.countDocuments({ userId: user._id, isArchived: { $ne: true } }).exec();
        const totalShelves = await this.shelfModel.countDocuments({ userId: user._id }).exec();
        const followersCount = await this.followModel.countDocuments({ followingId: new Types.ObjectId(user._id.toString()) }).exec();

        return new UserProfileWithStatsDto({
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          preferredLanguage: user.preferredLanguage || 'ru',
          showPlants: user.showPlants ?? true,
          showShelves: user.showShelves ?? true,
          showPlantHistory: user.showPlantHistory ?? true,
          showWishlist: user.showWishlist ?? false,
          bio: user.bio,
          avatar: user.avatar,
          socialLinks: this.filterPublicSocialLinks(user.socialLinks),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalPlants,
            totalShelves,
            followersCount,
          },
        });
      })
    );

    // Сортировка по количеству растений — после получения статистики
    if (sort === 'mostPlants') {
      usersWithStats.sort((a, b) => b.stats.totalPlants - a.stats.totalPlants);
    }

    return usersWithStats;
  }

  async getSeoSitemap(): Promise<SeoSitemapUserDto[]> {
    const users = await this.userModel
      .find({ isBlocked: { $ne: true } })
      .select('_id updatedAt showPlants showShelves')
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const userIdsWithPlants = users
      .filter((user) => user.showPlants !== false)
      .map((user) => user._id);
    const userIdsWithShelves = users
      .filter((user) => user.showShelves !== false)
      .map((user) => user._id);

    const [plants, shelves] = await Promise.all([
      userIdsWithPlants.length > 0
        ? this.plantModel
            .find({
              userId: { $in: userIdsWithPlants },
              isArchived: { $ne: true },
            })
            .select('_id userId updatedAt')
            .lean()
            .exec()
        : [],
      userIdsWithShelves.length > 0
        ? this.shelfModel
            .find({
              userId: { $in: userIdsWithShelves },
            })
            .select('_id userId updatedAt')
            .lean()
            .exec()
        : [],
    ]);

    const plantsByUserId = new Map<string, SeoSitemapItemDto[]>();
    for (const plant of plants) {
      const userId = plant.userId.toString();
      const items = plantsByUserId.get(userId) ?? [];
      items.push(
        new SeoSitemapItemDto({
          id: plant._id.toString(),
          updatedAt: plant.updatedAt,
        }),
      );
      plantsByUserId.set(userId, items);
    }

    const shelvesByUserId = new Map<string, SeoSitemapItemDto[]>();
    for (const shelf of shelves) {
      const userId = shelf.userId.toString();
      const items = shelvesByUserId.get(userId) ?? [];
      items.push(
        new SeoSitemapItemDto({
          id: shelf._id.toString(),
          updatedAt: shelf.updatedAt,
        }),
      );
      shelvesByUserId.set(userId, items);
    }

    return users.map(
      (user) =>
        new SeoSitemapUserDto({
          id: user._id.toString(),
          updatedAt: user.updatedAt,
          showPlants: user.showPlants ?? true,
          showShelves: user.showShelves ?? true,
          plants: plantsByUserId.get(user._id.toString()) ?? [],
          shelves: shelvesByUserId.get(user._id.toString()) ?? [],
        }),
    );
  }

  async getUserProfileWithStats(userId: string, requester?: UserDocument | null): Promise<UserProfileWithStatsDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user || user.isBlocked) {
      throw new NotFoundException('Пользователь не найден');
    }

    const canBypassPrivacy = this.canBypassPrivacy(user, requester);

    // Подсчитываем количество растений пользователя (всегда реальное число — приватность скрывает список, не счётчик)
    const totalPlants = await this.plantModel.countDocuments({
      userId: user._id,
      isArchived: { $ne: true },
    }).exec();

    // Подсчитываем количество полок пользователя (всегда реальное число)
    const totalShelves = await this.shelfModel.countDocuments({ userId: user._id }).exec();

    const followersCount = await this.followModel.countDocuments({ followingId: new Types.ObjectId(user._id.toString()) }).exec();

    return new UserProfileWithStatsDto({
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      preferredLanguage: user.preferredLanguage || 'ru',
      showPlants: user.showPlants ?? true,
      showShelves: user.showShelves ?? true,
      showPlantHistory: user.showPlantHistory ?? true,
      showWishlist: user.showWishlist ?? false,
      bio: user.bio,
      avatar: user.avatar,
      socialLinks: this.filterPublicSocialLinks(user.socialLinks),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        totalPlants,
        totalShelves,
        followersCount,
      },
    });
  }

  toResponseDto(user: UserDocument): UserResponseDto {
    return new UserResponseDto({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLanguage: user.preferredLanguage || 'ru',
      showPlants: user.showPlants ?? true,
      showShelves: user.showShelves ?? true,
      showPlantHistory: user.showPlantHistory ?? true,
      showWishlist: user.showWishlist ?? false,
      isBlocked: user.isBlocked ?? false,
      bio: user.bio,
      avatar: user.avatar,
      socialLinks: user.socialLinks || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Remove old avatar file if exists
    if (user.avatar) {
      const oldPath = `${FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS}/${user.avatar}`;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await compressImage(`${FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS}/${file.filename}`);

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { avatar: file.filename },
      { new: true },
    ).exec();

    return updated;
  }

  async removeAvatar(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.avatar) {
      const filePath = `${FILE_UPLOAD_CONFIG.UPLOAD_DIRS.AVATARS}/${user.avatar}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { $unset: { avatar: '' } },
      { new: true },
    ).exec();

    return updated;
  }

  async adminUpdateUser(userId: string, dto: AdminUpdateUserDto): Promise<UserDocument> {
    if (dto.email) {
      const existing = await this.userModel.findOne({ email: dto.email, _id: { $ne: userId } });
      if (existing) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
    }

    if (dto.name) {
      const existing = await this.userModel.findOne({ name: dto.name, _id: { $ne: userId } });
      if (existing) {
        throw new ConflictException('Пользователь с таким именем уже существует');
      }
    }

    const user = await this.userModel.findByIdAndUpdate(userId, dto, { new: true }).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // При блокировке сбрасываем refresh token
    if (dto.isBlocked === true) {
      await this.updateRefreshToken(userId, null);
    }

    return user;
  }

  async adminDeleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Collect IDs of user's content to remove foreign bookmarks pointing to them
    const [plantIds, historyIds] = await Promise.all([
      this.plantModel.find({ userId: user._id }, { _id: 1 }).exec().then((docs) => docs.map((d) => d._id)),
      this.plantHistoryModel.find({ userId: user._id }, { _id: 1 }).exec().then((docs) => docs.map((d) => d._id)),
    ]);

    await Promise.all([
      this.plantModel.deleteMany({ userId: user._id }).exec(),
      this.plantHistoryModel.deleteMany({ userId: user._id }).exec(),
      this.shelfModel.deleteMany({ userId: user._id }).exec(),
      this.wishlistModel.deleteMany({ userId: user._id }).exec(),
      this.followModel.deleteMany({ $or: [{ followerId: new Types.ObjectId(userId) }, { followingId: new Types.ObjectId(userId) }] }).exec(),
      // Delete bookmarks created by this user
      this.bookmarkModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec(),
      // Delete bookmarks by other users pointing to this user's content
      ...(plantIds.length > 0 ? [this.bookmarkModel.deleteMany({ itemType: 'plant', itemId: { $in: plantIds } }).exec()] : []),
      ...(historyIds.length > 0 ? [this.bookmarkModel.deleteMany({ itemType: 'plant_history', itemId: { $in: historyIds } }).exec()] : []),
    ]);

    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async getUserPlants(userId: string, requester?: UserDocument | null): Promise<Plant[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!this.canBypassPrivacy(user, requester) && !(user.showPlants ?? true)) {
      throw new ForbiddenException('Пользователь скрыл свою коллекцию растений');
    }
    return this.plantModel
      .find({ userId: user._id, isArchived: { $ne: true } })
      .populate('genusId')
      .populate('varietyId')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async getUserPlant(userId: string, plantId: string, requester?: UserDocument | null): Promise<Plant> {
    this.logger.log(`getUserPlant: userId=${userId} plantId=${plantId} requesterId=${requester?._id ?? 'anonymous'}`);
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      this.logger.warn(`getUserPlant: user ${userId} not found`);
      throw new NotFoundException('Пользователь не найден');
    }
    const bypass = this.canBypassPrivacy(user, requester);
    const showPlants = user.showPlants ?? true;
    this.logger.log(`getUserPlant: bypass=${bypass} showPlants=${showPlants} (user.showPlants=${user.showPlants})`);
    if (!bypass && !showPlants) {
      this.logger.warn(`getUserPlant: 403 — userId=${userId} plantId=${plantId} requesterId=${requester?._id ?? 'anonymous'}`);
      throw new ForbiddenException('Пользователь скрыл свою коллекцию растений');
    }
    const plant = await this.plantModel
      .findOne({ _id: plantId, userId: user._id, isArchived: { $ne: true } })
      .populate('genusId')
      .populate('varietyId')
      .populate('shelfIds')
      .exec();
    if (!plant) {
      throw new NotFoundException('Растение не найдено');
    }
    return plant;
  }

  async getUserPlantHistory(userId: string, plantId: string, requester?: UserDocument | null): Promise<PlantHistory[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!this.canBypassPrivacy(user, requester) && !(user.showPlantHistory ?? true)) {
      throw new ForbiddenException('Пользователь скрыл историю своих растений');
    }
    const plant = await this.plantModel.findOne({ _id: plantId, userId: user._id, isArchived: { $ne: true } }).exec();
    if (!plant) {
      throw new NotFoundException('Растение не найдено');
    }
    // plantId is stored as a plain string in the DB (not ObjectId), so we bypass
    // Mongoose schema casting by using the native MongoDB collection driver.
    const docs = await this.plantHistoryModel.collection
      .find({ plantId: plantId, userId: user._id })
      .sort({ date: -1 })
      .toArray();
    return docs as unknown as PlantHistory[];
  }

  async getUserShelves(userId: string, requester?: UserDocument | null): Promise<any[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!this.canBypassPrivacy(user, requester) && !(user.showShelves ?? true)) {
      throw new ForbiddenException('Пользователь скрыл свои полки');
    }
    const shelves = await this.shelfModel
      .find({ userId: user._id })
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();

    return Promise.all(
      shelves.map(async (shelf) => {
        let plants = [];
        if (shelf.plantIds && shelf.plantIds.length > 0) {
          plants = await this.plantModel
            .find({ _id: { $in: shelf.plantIds.slice(0, 3) }, userId: user._id, isArchived: { $ne: true } })
            .populate('genusId')
            .populate('varietyId')
            .exec();
        }
        return { ...shelf.toObject(), plants, plantsCount: shelf.plantIds?.length || 0 };
      }),
    );
  }

  async getUserWishlist(userId: string, requester?: UserDocument | null): Promise<any[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!this.canBypassPrivacy(user, requester) && !user.showWishlist) {
      throw new ForbiddenException('Пользователь скрыл свой вишлист');
    }
    return this.wishlistModel
      .find({ userId: user._id })
      .populate('genusId')
      .populate('varietyId')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async getUserShelf(userId: string, shelfId: string, requester?: UserDocument | null): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (!this.canBypassPrivacy(user, requester) && !(user.showShelves ?? true)) {
      throw new ForbiddenException('Пользователь скрыл свои полки');
    }
    const shelf = await this.shelfModel.findOne({ _id: shelfId, userId: user._id }).exec();
    if (!shelf) {
      throw new NotFoundException('Полка не найдена');
    }
    let plants = [];
    if (shelf.plantIds && shelf.plantIds.length > 0) {
      plants = await this.plantModel
        .find({ _id: { $in: shelf.plantIds }, userId: user._id, isArchived: { $ne: true } })
        .populate('genusId')
        .populate('varietyId')
        .sort({ createdAt: -1 })
        .exec();
    }
    return { ...shelf.toObject(), plants };
  }
}
