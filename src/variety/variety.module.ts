import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VarietyService } from './variety.service';
import { VarietyController } from './variety.controller';
import { Variety, VarietySchema } from './schemas/variety.schema';
import { AiModule } from '../ai/ai.module';
import { GenusModule } from '../genus/genus.module';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Variety.name, schema: VarietySchema },
      { name: Plant.name, schema: PlantSchema },
    ]),
    AiModule,
    GenusModule,
    TelegramModule,
  ],
  controllers: [VarietyController],
  providers: [VarietyService],
  exports: [VarietyService],
})
export class VarietyModule {}
