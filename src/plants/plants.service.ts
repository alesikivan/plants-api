import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plant, PlantDocument } from './schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';
import { Genus, GenusDocument } from '../genus/schemas/genus.schema';
import { Variety, VarietyDocument } from '../variety/schemas/variety.schema';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import * as fs from 'fs';
import { compressImage } from '../common/utils/compress-image';

export interface PlantFilterDto {
  search?: string;
  genusId?: string;
  varietyId?: string;
  shelfId?: string;
  showArchived?: boolean;
}

/**
 * Builds a regex that matches the search term case-insensitively for any
 * script (Cyrillic, Latin, etc.) by expanding each character into a
 * [lowerUpper] class, bypassing MongoDB PCRE's unreliable 'i' flag for
 * non-ASCII characters.
 */
function buildCaseInsensitiveRegex(term: string): RegExp {
  const pattern = term
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const upper = char.toUpperCase();
      if (lower === upper) {
        // Non-alphabetic — escape regex special chars
        return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      return `[${lower}${upper}]`;
    })
    .join('');
  return new RegExp(pattern);
}

@Injectable()
export class PlantsService {
  constructor(
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
    @InjectModel(Genus.name) private genusModel: Model<GenusDocument>,
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
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
      await compressImage(`./uploads/plants/${file.filename}`);
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

  async findAll(userId: string, filters: PlantFilterDto = {}): Promise<Plant[]> {
    const query: any = { userId, isArchived: filters.showArchived ? true : { $ne: true } };

    if (filters.genusId) {
      query.genusId = filters.genusId;
    }

    if (filters.varietyId) {
      query.varietyId = filters.varietyId;
    }

    if (filters.shelfId) {
      query.shelfIds = filters.shelfId;
    }

    if (filters.search) {
      // Build a regex that handles both registers for every character
      // (Cyrillic included) without relying on the PCRE 'i' flag
      const regex = buildCaseInsensitiveRegex(filters.search.trim());
      const nameQuery = { $or: [{ nameRu: regex }, { nameEn: regex }] };

      const [matchingGenera, matchingVarieties] = await Promise.all([
        this.genusModel.find(nameQuery).select('_id'),
        this.varietyModel.find(nameQuery).select('_id'),
      ]);

      // genusId/varietyId in plant docs are stored as strings, so compare as strings
      query.$or = [
        { genusId: { $in: matchingGenera.map((g) => g._id.toString()) } },
        { varietyId: { $in: matchingVarieties.map((v) => v._id.toString()) } },
      ];
    }

    return await this.plantModel
      .find(query)
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
      await compressImage(`./uploads/plants/${file.filename}`);
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

  async archive(id: string, userId: string): Promise<Plant> {
    const existing = await this.plantModel.findOne({ _id: id, userId }).exec();
    if (!existing) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    // Удалить из всех полок (обе формы ID на случай несоответствия типов)
    const plantIdStr = existing._id.toString();
    await this.shelfModel.updateMany(
      { plantIds: { $in: [existing._id, plantIdStr] } },
      { $pull: { plantIds: { $in: [existing._id, plantIdStr] } } }
    );

    const plant = await this.plantModel
      .findOneAndUpdate(
        { _id: id, userId },
        { isArchived: true, shelfIds: [] },
        { new: true }
      )
      .populate('genusId')
      .populate('varietyId')
      .exec();

    return plant;
  }

  async unarchive(id: string, userId: string): Promise<Plant> {
    const plant = await this.plantModel
      .findOneAndUpdate({ _id: id, userId }, { isArchived: false }, { new: true })
      .populate('genusId')
      .populate('varietyId')
      .exec();

    if (!plant) {
      throw new NotFoundException(`Plant with ID ${id} not found`);
    }

    return plant;
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
