import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plant, PlantDocument } from './schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import * as fs from 'fs';

@Injectable()
export class PlantsService {
  constructor(
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
  ) {}

  async create(
    createPlantDto: CreatePlantDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Plant> {
    const plantData: any = {
      ...createPlantDto,
      userId,
    };

    if (file) {
      plantData.photo = file.filename;
    }

    const plant = new this.plantModel(plantData);
    await plant.save();

    // Синхронизация обратных связей: добавить plant._id в полки
    if (createPlantDto.shelfIds?.length > 0) {
      await this.shelfModel.updateMany(
        { _id: { $in: createPlantDto.shelfIds }, userId },
        { $addToSet: { plantIds: plant._id } }
      );
    }

    return plant;
  }

  async findAll(userId: string): Promise<Plant[]> {
    return await this.plantModel
      .find({ userId })
      .populate('genusId')
      .populate('varietyId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<Plant> {
    const plant = await this.plantModel
      .findOne({ _id: id, userId })
      .populate('genusId')
      .populate('varietyId')
      .populate('shelfIds')
      .exec();

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    return plant;
  }

  async update(
    id: string,
    updatePlantDto: UpdatePlantDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Plant> {
    const existingPlant = await this.plantModel.findOne({ _id: id, userId }).exec();

    if (!existingPlant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    const updateData: any = { ...updatePlantDto };
    delete updateData.removePhoto; // Remove this field from update data
    delete updateData.removeVariety;

    if (updatePlantDto.removeVariety) {
      updateData.varietyId = null;
    }

    // Обработка изменения полок (синхронизация many-to-many)
    if (updatePlantDto.shelfIds !== undefined) {
      const oldShelfIds = existingPlant.shelfIds?.map(id => id.toString()) || [];
      const newShelfIds = updatePlantDto.shelfIds || [];

      const toAdd = newShelfIds.filter(id => !oldShelfIds.includes(id));
      const toRemove = oldShelfIds.filter(id => !newShelfIds.includes(id));

      await Promise.all([
        ...toAdd.map(shelfId =>
          this.shelfModel.updateOne(
            { _id: shelfId, userId },
            { $addToSet: { plantIds: id } }
          )
        ),
        ...toRemove.map(shelfId =>
          this.shelfModel.updateOne(
            { _id: shelfId, userId },
            { $pull: { plantIds: id } }
          )
        )
      ]);
    }

    // Handle photo removal
    if (updatePlantDto.removePhoto && existingPlant.photo) {
      const oldPhotoPath = `./uploads/plants/${existingPlant.photo}`;
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
      updateData.photo = null;
    }

    // Handle new photo upload
    if (file) {
      // Delete old photo if exists
      if (existingPlant.photo) {
        const oldPhotoPath = `./uploads/plants/${existingPlant.photo}`;
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.photo = file.filename;
    }

    const plant = await this.plantModel
      .findOneAndUpdate({ _id: id, userId }, updateData, { new: true })
      .populate('genusId')
      .populate('varietyId')
      .exec();

    return plant;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.plantModel.findOneAndDelete({ _id: id, userId }).exec();

    if (!result) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    // Убрать растение из всех полок
    await this.shelfModel.updateMany(
      { plantIds: result._id },
      { $pull: { plantIds: result._id } }
    );

    // Delete photo if exists
    if (result.photo) {
      const photoPath = `./uploads/plants/${result.photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
  }

  async adminFindAll(): Promise<Plant[]> {
    return await this.plantModel
      .find({})
      .populate('genusId')
      .populate('varietyId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async adminRemove(id: string): Promise<void> {
    const result = await this.plantModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    await this.shelfModel.updateMany(
      { plantIds: result._id },
      { $pull: { plantIds: result._id } }
    );

    if (result.photo) {
      const photoPath = `./uploads/plants/${result.photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
  }
}
