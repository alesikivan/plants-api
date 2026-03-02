import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlantsService } from './plants.service';
import { PlantHistoryService } from './plant-history.service';
import { PlantsController } from './plants.controller';
import { Plant, PlantSchema } from './schemas/plant.schema';
import { PlantHistory, PlantHistorySchema } from './schemas/plant-history.schema';
import { Shelf, ShelfSchema } from '../shelves/schemas/shelf.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plant.name, schema: PlantSchema },
      { name: PlantHistory.name, schema: PlantHistorySchema },
      { name: Shelf.name, schema: ShelfSchema },
    ]),
  ],
  controllers: [PlantsController],
  providers: [PlantsService, PlantHistoryService],
  exports: [PlantsService, PlantHistoryService],
})
export class PlantsModule {}
