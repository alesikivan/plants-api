import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileWithStatsDto } from './dto/user-profile-with-stats.dto';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';
import { PlantHistory, PlantHistoryDocument } from '../plants/schemas/plant-history.schema';
import { Wishlist, WishlistDocument } from '../wishlist/schemas/wishlist.schema';
import { Role } from '../common/enums/role.enum';
import { compressImage } from '../common/utils/compress-image';
import { FILE_UPLOAD_CONFIG } from '../config/file-upload.config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
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

  async create(createUserDto: CreateUserDto, skipVerification = false): Promise<{ user: UserDocument; verificationToken: string | null }> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const existingName = await this.userModel.findOne({ name: createUserDto.name });
    if (existingName) {
      throw new ConflictException('Пользователь с таким именем уже существует');
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

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      updateUserDto,
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async searchUsers(query?: string): Promise<UserProfileWithStatsDto[]> {
    let filter: Record<string, any> = { isBlocked: { $ne: true } };

    if (query && query.trim()) {
      filter = {
        ...filter,
        name: { $regex: query.trim(), $options: 'i' }
      };
    }

    const users = await this.userModel.find(filter).sort({ createdAt: 1 }).exec();

    // Получаем статистику для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalPlants = await this.plantModel.countDocuments({ userId: user._id, isArchived: { $ne: true } }).exec();
        const totalShelves = await this.shelfModel.countDocuments({ userId: user._id }).exec();

        return new UserProfileWithStatsDto({
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          preferredLanguage: user.preferredLanguage || 'ru',
          showPlants: user.showPlants ?? true,
          showShelves: user.showShelves ?? true,
          showPlantHistory: user.showPlantHistory ?? true,
          avatar: user.avatar,
          socialLinks: this.filterPublicSocialLinks(user.socialLinks),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalPlants,
            totalShelves,
          },
        });
      })
    );

    return usersWithStats;
  }

  async getUserProfileWithStats(userId: string): Promise<UserProfileWithStatsDto> {
    const user = await this.userModel.findById(userId).exec();

    if (!user || user.isBlocked) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Подсчитываем количество растений пользователя
    const totalPlants = await this.plantModel.countDocuments({ userId: user._id }).exec();

    // Подсчитываем количество полок пользователя
    const totalShelves = await this.shelfModel.countDocuments({ userId: user._id }).exec();

    return new UserProfileWithStatsDto({
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      preferredLanguage: user.preferredLanguage || 'ru',
      showPlants: user.showPlants ?? true,
      showShelves: user.showShelves ?? true,
      showPlantHistory: user.showPlantHistory ?? true,
      avatar: user.avatar,
      socialLinks: this.filterPublicSocialLinks(user.socialLinks),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        totalPlants,
        totalShelves,
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
      isBlocked: user.isBlocked ?? false,
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

    await Promise.all([
      this.plantModel.deleteMany({ userId: user._id }).exec(),
      this.plantHistoryModel.deleteMany({ userId: user._id }).exec(),
      this.shelfModel.deleteMany({ userId: user._id }).exec(),
      this.wishlistModel.deleteMany({ userId: user._id }).exec(),
    ]);

    await this.userModel.findByIdAndDelete(userId).exec();
  }

  async getUserPlants(userId: string, requesterRole?: Role): Promise<Plant[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (requesterRole !== Role.ADMIN && !(user.showPlants ?? true)) {
      throw new ForbiddenException('Пользователь скрыл свою коллекцию растений');
    }
    return this.plantModel
      .find({ userId: user._id, isArchived: { $ne: true } })
      .populate('genusId')
      .populate('varietyId')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async getUserPlant(userId: string, plantId: string, requesterRole?: Role): Promise<Plant> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (requesterRole !== Role.ADMIN && !(user.showPlants ?? true)) {
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

  async getUserPlantHistory(userId: string, plantId: string, requesterRole?: Role): Promise<PlantHistory[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (requesterRole !== Role.ADMIN && !(user.showPlantHistory ?? true)) {
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

  async getUserShelves(userId: string, requesterRole?: Role): Promise<any[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (requesterRole !== Role.ADMIN && !(user.showShelves ?? true)) {
      throw new ForbiddenException('Пользователь скрыл свои полки');
    }
    const shelves = await this.shelfModel
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
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

  async getUserShelf(userId: string, shelfId: string, requesterRole?: Role): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (requesterRole !== Role.ADMIN && !(user.showShelves ?? true)) {
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
