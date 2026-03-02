import { Injectable, NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Variety, VarietyDocument } from './schemas/variety.schema';
import { CreateVarietyDto } from './dto/create-variety.dto';
import { UpdateVarietyDto } from './dto/update-variety.dto';
import { AiService, PlantNameSuggestion } from '../ai/ai.service';
import { GenusService } from '../genus/genus.service';

export interface ValidateVarietyResult {
  suggestion: PlantNameSuggestion;
}

@Injectable()
export class VarietyService {
  constructor(
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
    private aiService: AiService,
    private genusService: GenusService,
  ) {}

  async create(createVarietyDto: CreateVarietyDto): Promise<Variety> {
    try {
      const variety = new this.varietyModel(createVarietyDto);
      return await variety.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Variety with this name already exists for this genus');
      }
      throw error;
    }
  }

  async findAll(search?: string): Promise<Variety[]> {
    const query = search
      ? {
          $or: [
            { nameRu: { $regex: search, $options: 'i' } },
            { nameEn: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    return await this.varietyModel
      .find(query)
      .populate('genusId')
      .sort({ nameRu: 1 })
      .exec();
  }

  async findByGenus(genusId: string, search?: string): Promise<Variety[]> {
    const query: any = { genusId };

    if (search) {
      query.$or = [
        { nameRu: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
      ];
    }

    return await this.varietyModel
      .find(query)
      .populate('genusId')
      .sort({ nameRu: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Variety> {
    const variety = await this.varietyModel
      .findById(id)
      .populate('genusId')
      .exec();
    if (!variety) {
      throw new NotFoundException(`Variety with ID ${id} not found`);
    }
    return variety;
  }

  async update(id: string, updateVarietyDto: UpdateVarietyDto): Promise<Variety> {
    try {
      const variety = await this.varietyModel
        .findByIdAndUpdate(id, updateVarietyDto, { new: true })
        .populate('genusId')
        .exec();
      if (!variety) {
        throw new NotFoundException(`Variety with ID ${id} not found`);
      }
      return variety;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Variety with this name already exists for this genus');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.varietyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Variety with ID ${id} not found`);
    }
  }

  async validate(query: string, genusId: string): Promise<ValidateVarietyResult> {
    const genus = await this.genusService.findOne(genusId);
    const suggestion = await this.aiService.suggestPlantName(query, 'variety', genus.nameRu);
    if (!suggestion) {
      throw new ServiceUnavailableException('AI validation is not available');
    }
    return { suggestion };
  }
}
