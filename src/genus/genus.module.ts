import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GenusService } from './genus.service';
import { GenusController } from './genus.controller';
import { Genus, GenusSchema } from './schemas/genus.schema';
import { AiModule } from '../ai/ai.module';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Genus.name, schema: GenusSchema },
      { name: Plant.name, schema: PlantSchema },
    ]),
    AiModule,
  ],
  controllers: [GenusController],
  providers: [GenusService],
  exports: [GenusService],
})
export class GenusModule {}
