import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
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

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const existingName = await this.userModel.findOne({ name: createUserDto.name });
    if (existingName) {
      throw new ConflictException('Пользователь с таким именем уже существует');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.save();
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
    return this.userModel.find().exec();
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
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
    let filter = {};

    if (query && query.trim()) {
      filter = {
        name: { $regex: query.trim(), $options: 'i' }
      };
    }

    const users = await this.userModel.find(filter).exec();

    // Получаем статистику для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalPlants = await this.plantModel.countDocuments({ userId: user._id }).exec();
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

    if (!user) {
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
      .find({ userId: user._id })
      .populate('genusId')
      .populate('varietyId')
      .sort({ createdAt: -1 })
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
      .findOne({ _id: plantId, userId: user._id })
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
    const plant = await this.plantModel.findOne({ _id: plantId, userId: user._id }).exec();
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
            .find({ _id: { $in: shelf.plantIds.slice(0, 3) }, userId: user._id })
            .populate('genusId')
            .populate('varietyId')
            .exec();
        }
        return { ...shelf.toObject(), plants };
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
        .find({ _id: { $in: shelf.plantIds }, userId: user._id })
        .populate('genusId')
        .populate('varietyId')
        .sort({ createdAt: -1 })
        .exec();
    }
    return { ...shelf.toObject(), plants };
  }
}
