import { Injectable, NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Genus, GenusDocument } from './schemas/genus.schema';
import { CreateGenusDto } from './dto/create-genus.dto';
import { UpdateGenusDto } from './dto/update-genus.dto';
import { AiService, PlantNameSuggestion } from '../ai/ai.service';

export interface ValidateGenusResult {
  suggestion: PlantNameSuggestion;
}

@Injectable()
export class GenusService {
  constructor(
    @InjectModel(Genus.name) private genusModel: Model<GenusDocument>,
    private aiService: AiService,
  ) {}

  async create(createGenusDto: CreateGenusDto): Promise<Genus> {
    try {
      const genus = new this.genusModel(createGenusDto);
      return await genus.save();
    } catch (error) {
      if (error.code === 11000) {
        console.error('Duplicate key error:', error.keyValue);
        throw new ConflictException(`Такой род уже сущетсвует: ${JSON.stringify(error.keyValue)}`);
      }
      throw error;
    }
  }

  async findAll(search?: string): Promise<Genus[]> {
    const query = search
      ? {
          $or: [
            { nameRu: { $regex: search, $options: 'i' } },
            { nameEn: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    return await this.genusModel.find(query).sort({ nameRu: 1 }).exec();
  }

  async findOne(id: string): Promise<Genus> {
    const genus = await this.genusModel.findById(id).exec();
    if (!genus) {
      throw new NotFoundException(`Genus with ID ${id} not found`);
    }
    return genus;
  }

  async update(id: string, updateGenusDto: UpdateGenusDto): Promise<Genus> {
    try {
      const genus = await this.genusModel
        .findByIdAndUpdate(id, updateGenusDto, { new: true })
        .exec();
      if (!genus) {
        throw new NotFoundException(`Genus with ID ${id} not found`);
      }
      return genus;
    } catch (error) {
      if (error.code === 11000) {
        console.error('Duplicate key error:', error.keyValue);
        throw new ConflictException(`Такой род уже сущетсвует`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.genusModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Genus with ID ${id} not found`);
    }
  }

  async validate(query: string): Promise<ValidateGenusResult> {
    const suggestion = await this.aiService.suggestPlantName(query, 'genus');
    if (!suggestion) {
      throw new ServiceUnavailableException('AI validation is not available');
    }
    return { suggestion };
  }
}
