import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shelf, ShelfDocument } from './schemas/shelf.schema';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import * as fs from 'fs';

@Injectable()
export class ShelvesService {
  constructor(
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
  ) {}

  async create(
    createShelfDto: CreateShelfDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Shelf> {
    const shelfData: any = {
      ...createShelfDto,
      userId,
    };

    if (file) {
      shelfData.photo = file.filename;
    }

    const shelf = new this.shelfModel(shelfData);
    return await shelf.save();
  }

  async findAll(userId: string): Promise<any[]> {
    const shelves = await this.shelfModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();

    // For each shelf, get plants and attach them
    const shelvesWithPlants = await Promise.all(
      shelves.map(async (shelf) => {
        let plants = [];

        // Если есть plantIds в полке, получаем растения по их ID
        if (shelf.plantIds && shelf.plantIds.length > 0) {
          plants = await this.plantModel
            .find({
              _id: { $in: shelf.plantIds.slice(0, 3) }, // Только первые 3
              userId,
            })
            .populate('genusId')
            .populate('varietyId')
            .exec();
        } else {
          // Fallback: поддержка старого формата (shelfId) и нового (shelfIds)
          plants = await this.plantModel
            .find({
              userId,
              $or: [
                { shelfIds: shelf._id },
                { shelfId: shelf._id }
              ]
            })
            .populate('genusId')
            .populate('varietyId')
            .limit(3)
            .exec();
        }

        return {
          ...shelf.toObject(),
          plants,
        };
      }),
    );

    return shelvesWithPlants;
  }

  async findOne(id: string, userId: string): Promise<any> {
    const shelf = await this.shelfModel.findOne({ _id: id, userId }).exec();

    if (!shelf) {
      throw new NotFoundException(`Shelf with ID ${id} not found`);
    }

    let plants = [];

    // Если есть plantIds в полке, получаем растения по их ID
    if (shelf.plantIds && shelf.plantIds.length > 0) {
      plants = await this.plantModel
        .find({
          _id: { $in: shelf.plantIds },
          userId,
        })
        .populate('genusId')
        .populate('varietyId')
        .sort({ createdAt: -1 })
        .exec();
    } else {
      // Fallback: поддержка старого формата (shelfId) и нового (shelfIds)
      plants = await this.plantModel
        .find({
          userId,
          $or: [
            { shelfIds: shelf._id },
            { shelfId: shelf._id }
          ]
        })
        .populate('genusId')
        .populate('varietyId')
        .sort({ createdAt: -1 })
        .exec();
    }

    return {
      ...shelf.toObject(),
      plants,
    };
  }

  async update(
    id: string,
    updateShelfDto: UpdateShelfDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Shelf> {
    const existingShelf = await this.shelfModel.findOne({ _id: id, userId }).exec();

    if (!existingShelf) {
      throw new NotFoundException(`Shelf with ID ${id} not found`);
    }

    const updateData: any = { ...updateShelfDto };
    delete updateData.removePhoto;

    // Handle photo removal
    if (updateShelfDto.removePhoto && existingShelf.photo) {
      const oldPhotoPath = `./uploads/shelves/${existingShelf.photo}`;
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
      updateData.photo = null;
    }

    // Handle new photo upload
    if (file) {
      // Delete old photo if exists
      if (existingShelf.photo) {
        const oldPhotoPath = `./uploads/shelves/${existingShelf.photo}`;
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.photo = file.filename;
    }

    const shelf = await this.shelfModel
      .findOneAndUpdate({ _id: id, userId }, updateData, { new: true })
      .exec();

    return shelf;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.shelfModel.findOneAndDelete({ _id: id, userId }).exec();

    if (!result) {
      throw new NotFoundException(`Shelf with ID ${id} not found`);
    }

    // Убрать полку из массива shelfIds у всех растений
    await this.plantModel.updateMany(
      { shelfIds: result._id },
      { $pull: { shelfIds: result._id } },
    ).exec();

    // Delete photo if exists
    if (result.photo) {
      const photoPath = `./uploads/shelves/${result.photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
  }

  async adminFindAll(): Promise<Shelf[]> {
    return await this.shelfModel
      .find({})
      .sort({ createdAt: -1 })
      .exec();
  }

  async adminRemove(id: string): Promise<void> {
    const result = await this.shelfModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Shelf with ID ${id} not found`);
    }

    await this.plantModel.updateMany(
      { shelfIds: result._id },
      { $pull: { shelfIds: result._id } },
    ).exec();

    if (result.photo) {
      const photoPath = `./uploads/shelves/${result.photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
  }

  async addPlantToShelf(shelfId: string, plantId: string, userId: string): Promise<void> {
    // Проверяем валидность plantId
    if (!plantId || plantId === 'undefined' || plantId === 'null' || plantId.trim() === '') {
      throw new NotFoundException(`Invalid plant ID: ${plantId}`);
    }

    const shelf = await this.shelfModel.findOne({ _id: shelfId, userId }).exec();
    if (!shelf) {
      throw new NotFoundException(`Shelf with ID ${shelfId} not found`);
    }

    const plant = await this.plantModel.findOne({ _id: plantId, userId }).exec();
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    // Добавляем связь с обеих сторон (many-to-many)
    await Promise.all([
      this.plantModel.updateOne(
        { _id: plantId },
        { $addToSet: { shelfIds: shelfId } }
      ),
      this.shelfModel.updateOne(
        { _id: shelfId },
        { $addToSet: { plantIds: plantId } }
      )
    ]);
  }

  async removePlantFromShelf(shelfId: string, plantId: string, userId: string): Promise<void> {
    // Проверяем валидность plantId
    if (!plantId || plantId === 'undefined' || plantId === 'null' || plantId.trim() === '') {
      throw new NotFoundException(`Invalid plant ID: ${plantId}`);
    }

    const plant = await this.plantModel.findOne({ _id: plantId, userId }).exec();
    if (!plant) {
      throw new NotFoundException(`Plant with ID ${plantId} not found`);
    }

    // Убираем связь с обеих сторон
    await Promise.all([
      this.plantModel.updateOne(
        { _id: plantId },
        { $pull: { shelfIds: shelfId } }
      ),
      this.shelfModel.updateOne(
        { _id: shelfId },
        { $pull: { plantIds: plantId } }
      )
    ]);
  }

  async updateShelfPlants(shelfId: string, newPlantIds: string[], userId: string): Promise<void> {
    const shelf = await this.shelfModel.findOne({ _id: shelfId, userId }).exec();
    if (!shelf) {
      throw new NotFoundException(`Shelf with ID ${shelfId} not found`);
    }

    // Функция для проверки валидности ID
    const isValidId = (id: any): boolean => {
      if (!id) return false;
      const idStr = String(id).trim();
      return idStr !== '' && idStr !== 'undefined' && idStr !== 'null' && idStr !== 'NaN';
    };

    // Фильтруем только валидные ID из новых данных
    const validNewPlantIds = newPlantIds.filter(isValidId);

    // Фильтруем только валидные ID из существующих данных
    const oldPlantIds = (shelf.plantIds || [])
      .map(id => id?.toString())
      .filter(isValidId);

    const toAdd = validNewPlantIds.filter(id => !oldPlantIds.includes(id));
    const toRemove = oldPlantIds.filter(id => !validNewPlantIds.includes(id));

    console.log('updateShelfPlants:', {
      shelfId,
      validNewPlantIds,
      oldPlantIds,
      toAdd,
      toRemove
    });

    // Обновить растения (только если есть валидные ID)
    const updatePromises = [];

    // Добавляем растения
    if (toAdd.length > 0) {
      updatePromises.push(...toAdd
        .filter(isValidId)
        .map(plantId =>
          this.plantModel.updateOne(
            { _id: plantId, userId },
            { $addToSet: { shelfIds: shelfId } }
          )
        )
      );
    }

    // Удаляем растения
    if (toRemove.length > 0) {
      updatePromises.push(...toRemove
        .filter(isValidId)
        .map(plantId =>
          this.plantModel.updateOne(
            { _id: plantId, userId },
            { $pull: { shelfIds: shelfId } }
          )
        )
      );
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Обновить полку
    await this.shelfModel.updateOne(
      { _id: shelfId, userId },
      { $set: { plantIds: validNewPlantIds } }
    );
  }
}
