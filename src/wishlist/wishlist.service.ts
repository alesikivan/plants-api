import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { TelegramService } from '../telegram/telegram.service';

function buildCaseInsensitiveRegex(term: string): RegExp {
  const pattern = term
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const upper = char.toUpperCase();
      if (lower === upper) {
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      return `[${lower}${upper}]`;
    })
    .join('');
  return new RegExp(pattern);
}
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { Genus, GenusDocument } from '../genus/schemas/genus.schema';
import { Variety, VarietyDocument } from '../variety/schemas/variety.schema';
import * as fs from 'fs';
import { compressImage } from '../common/utils/compress-image';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
    @InjectModel(Genus.name) private genusModel: Model<GenusDocument>,
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
    private readonly i18n: I18nService,
    private readonly telegramService: TelegramService,
  ) {}

  async create(
    createWishlistDto: CreateWishlistDto,
    file: Express.Multer.File | undefined,
    userId: string,
    username: string,
  ): Promise<Wishlist> {
    const wishlistData: any = {
      ...createWishlistDto,
      userId,
    };

    if (file) {
      wishlistData.photo = file.filename;
      await compressImage(`./uploads/wishlist/${file.filename}`);
    }

    const wishlist = new this.wishlistModel(wishlistData);
    await wishlist.save();

    const genus = createWishlistDto.genusId
      ? await this.genusModel.findById(createWishlistDto.genusId).exec()
      : null;
    const genusName = genus?.nameRu || genus?.nameEn || 'Unknown';
    this.telegramService.notifyWishlistCreated(userId, username, String(wishlist._id), genusName).catch(() => {});

    return wishlist;
  }

  async findAll(
    userId: string,
    search?: string,
    genusId?: string,
    varietyId?: string,
  ): Promise<Wishlist[]> {
    const query: any = { userId };

    if (genusId) {
      query.genusId = genusId;
    }

    if (varietyId) {
      query.varietyId = varietyId;
    }

    if (search) {
      const regex = buildCaseInsensitiveRegex(search.trim());
      const nameQuery = { $or: [{ nameRu: regex }, { nameEn: regex }] };
      const [matchingGenus, matchingVarieties] = await Promise.all([
        this.genusModel.find(nameQuery).select('_id').exec(),
        this.varietyModel.find(nameQuery).select('_id').exec(),
      ]);
      const genusIds = matchingGenus.map((g) => g._id.toString());
      const varietyIds = matchingVarieties.map((v) => v._id.toString());
      query.$or = [
        { genusId: { $in: genusIds } },
        { varietyId: { $in: varietyIds } },
      ];
    }

    return await this.wishlistModel
      .find(query)
      .populate('genusId')
      .populate('varietyId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<Wishlist> {
    const wishlist = await this.wishlistModel
      .findOne({ _id: id, userId })
      .populate('genusId')
      .populate('varietyId')
      .exec();

    if (!wishlist) {
      throw new NotFoundException(
        await this.i18n.translate('wishlist.errors.notFound')
      );
    }

    return wishlist;
  }

  async update(
    id: string,
    updateWishlistDto: UpdateWishlistDto,
    file: Express.Multer.File | undefined,
    userId: string,
    username: string,
  ): Promise<Wishlist> {
    const existingWishlist = await this.wishlistModel.findOne({ _id: id, userId }).exec();

    if (!existingWishlist) {
      throw new NotFoundException(
        await this.i18n.translate('wishlist.errors.notFound')
      );
    }

    const updateData: any = { ...updateWishlistDto };
    delete updateData.removeVariety;
    delete updateData.removePhoto;

    if (updateWishlistDto.removeVariety) {
      updateData.varietyId = null;
    }

    // Handle photo removal
    if (updateWishlistDto.removePhoto && existingWishlist.photo) {
      const oldPhotoPath = `./uploads/wishlist/${existingWishlist.photo}`;
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
      updateData.photo = null;
    }

    // Handle new photo upload
    if (file) {
      // Delete old photo if exists
      if (existingWishlist.photo) {
        const oldPhotoPath = `./uploads/wishlist/${existingWishlist.photo}`;
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.photo = file.filename;
      await compressImage(`./uploads/wishlist/${file.filename}`);
    }

    const wishlist = await this.wishlistModel
      .findOneAndUpdate({ _id: id, userId }, updateData, { new: true })
      .populate('genusId')
      .populate('varietyId')
      .exec();

    const genusId = updateWishlistDto.genusId || existingWishlist.genusId;
    const genus = genusId ? await this.genusModel.findById(genusId).exec() : null;
    const genusName = genus?.nameRu || genus?.nameEn || 'Unknown';
    this.telegramService.notifyWishlistUpdated(userId, username, id, genusName).catch(() => {});

    return wishlist;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.wishlistModel.findOneAndDelete({ _id: id, userId }).exec();

    if (!result) {
      throw new NotFoundException(
        await this.i18n.translate('wishlist.errors.notFound')
      );
    }

    // Delete photo if exists
    if (result.photo) {
      const photoPath = `./uploads/wishlist/${result.photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
  }
}
