import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import * as fs from 'fs';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async create(
    createWishlistDto: CreateWishlistDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Wishlist> {
    const wishlistData: any = {
      ...createWishlistDto,
      userId,
    };

    if (file) {
      wishlistData.photo = file.filename;
    }

    const wishlist = new this.wishlistModel(wishlistData);
    await wishlist.save();

    return wishlist;
  }

  async findAll(userId: string): Promise<Wishlist[]> {
    return await this.wishlistModel
      .find({ userId })
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
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
    }

    return wishlist;
  }

  async update(
    id: string,
    updateWishlistDto: UpdateWishlistDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Wishlist> {
    const existingWishlist = await this.wishlistModel.findOne({ _id: id, userId }).exec();

    if (!existingWishlist) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
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
    }

    const wishlist = await this.wishlistModel
      .findOneAndUpdate({ _id: id, userId }, updateData, { new: true })
      .populate('genusId')
      .populate('varietyId')
      .exec();

    return wishlist;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.wishlistModel.findOneAndDelete({ _id: id, userId }).exec();

    if (!result) {
      throw new NotFoundException(`Wishlist item with ID ${id} not found`);
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
