import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlantHistory, PlantHistoryDocument } from './schemas/plant-history.schema';
import { Plant, PlantDocument } from './schemas/plant.schema';
import { CreatePlantHistoryDto } from './dto/create-plant-history.dto';
import { UpdatePlantHistoryDto } from './dto/update-plant-history.dto';
import * as fs from 'fs';
import * as path from 'path';
import { compressImage } from '../common/utils/compress-image';

@Injectable()
export class PlantHistoryService {
  constructor(
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
  ) {}

  async create(
    plantId: string,
    createPlantHistoryDto: CreatePlantHistoryDto,
    files: Express.Multer.File[] | undefined,
    userId: string,
  ): Promise<PlantHistory> {
    // Проверяем, что растение существует и принадлежит пользователю
    const plant = await this.plantModel.findOne({ _id: plantId, userId }).exec();
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    // Проверяем, что предоставлен хотя бы комментарий или фото
    const hasComment = createPlantHistoryDto.comment && createPlantHistoryDto.comment.trim().length > 0;
    const hasPhotos = files && files.length > 0;

    if (!hasComment && !hasPhotos) {
      throw new BadRequestException('Either comment or photos must be provided');
    }

    const historyData: any = {
      ...createPlantHistoryDto,
      plantId,
      userId,
      photos: [],
    };

    if (files && files.length > 0) {
      historyData.photos = files.map(file => file.filename);
      await Promise.all(files.map(file => compressImage(`./uploads/plant-history/${file.filename}`)));
    }

    const history = new this.plantHistoryModel(historyData);
    await history.save();

    return history;
  }

  async findAllByPlant(plantId: string, userId: string): Promise<PlantHistory[]> {
    // Проверяем, что растение существует и принадлежит пользователю
    const plant = await this.plantModel.findOne({ _id: plantId, userId }).exec();
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    return await this.plantHistoryModel
      .find({ plantId, userId })
      .sort({ date: -1 })
      .exec();
  }

  async findOne(plantId: string, historyId: string, userId: string): Promise<PlantHistory> {
    const history = await this.plantHistoryModel
      .findOne({ _id: historyId, plantId, userId })
      .exec();

    if (!history) {
      throw new NotFoundException(`History entry with ID ${historyId} not found`);
    }

    return history;
  }

  async update(
    plantId: string,
    historyId: string,
    updatePlantHistoryDto: UpdatePlantHistoryDto,
    files: Express.Multer.File[] | undefined,
    userId: string,
  ): Promise<PlantHistory> {
    const existingHistory = await this.plantHistoryModel
      .findOne({ _id: historyId, plantId, userId })
      .exec();

    if (!existingHistory) {
      throw new NotFoundException(`History entry with ID ${historyId} not found`);
    }

    const updateData: any = { ...updatePlantHistoryDto };
    delete updateData.removePhotos;

    // Удаление указанных фотографий
    if (updatePlantHistoryDto.removePhotos && updatePlantHistoryDto.removePhotos.length > 0) {
      const photosToKeep = existingHistory.photos.filter(
        photo => !updatePlantHistoryDto.removePhotos.includes(photo)
      );

      // Физически удаляем файлы
      updatePlantHistoryDto.removePhotos.forEach(photo => {
        const photoPath = `./uploads/plant-history/${photo}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      });

      updateData.photos = photosToKeep;
    }

    // Добавление новых фотографий
    if (files && files.length > 0) {
      const currentPhotos = updateData.photos !== undefined
        ? updateData.photos
        : existingHistory.photos;
      updateData.photos = [...currentPhotos, ...files.map(file => file.filename)];
      await Promise.all(files.map(file => compressImage(`./uploads/plant-history/${file.filename}`)));
    }

    const history = await this.plantHistoryModel
      .findOneAndUpdate(
        { _id: historyId, plantId, userId },
        updateData,
        { new: true }
      )
      .exec();

    return history;
  }

  async remove(plantId: string, historyId: string, userId: string): Promise<void> {
    const history = await this.plantHistoryModel
      .findOneAndDelete({ _id: historyId, plantId, userId })
      .exec();

    if (!history) {
      throw new NotFoundException(`History entry with ID ${historyId} not found`);
    }

    // Удаляем все фотографии записи
    if (history.photos && history.photos.length > 0) {
      history.photos.forEach(photo => {
        const photoPath = `./uploads/plant-history/${photo}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      });
    }
  }

  async adminFindAll(): Promise<PlantHistory[]> {
    return await this.plantHistoryModel
      .find({})
      .sort({ date: -1 })
      .exec();
  }

  async adminRemove(historyId: string): Promise<void> {
    const history = await this.plantHistoryModel
      .findByIdAndDelete(historyId)
      .exec();

    if (!history) {
      throw new NotFoundException(`History entry with ID ${historyId} not found`);
    }

    if (history.photos && history.photos.length > 0) {
      history.photos.forEach(photo => {
        const photoPath = `./uploads/plant-history/${photo}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      });
    }
  }
}
