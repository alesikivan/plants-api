import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlantsService } from './plants.service';
import { PlantHistoryService } from './plant-history.service';
import { PlantsController } from './plants.controller';
import { Plant, PlantSchema } from './schemas/plant.schema';
import { PlantHistory, PlantHistorySchema } from './schemas/plant-history.schema';
import { Shelf, ShelfSchema } from '../shelves/schemas/shelf.schema';
import { Genus, GenusSchema } from '../genus/schemas/genus.schema';
import { Variety, VarietySchema } from '../variety/schemas/variety.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TelegramModule,
    MongooseModule.forFeature([
      { name: Plant.name, schema: PlantSchema },
      { name: PlantHistory.name, schema: PlantHistorySchema },
      { name: Shelf.name, schema: ShelfSchema },
      { name: Genus.name, schema: GenusSchema },
      { name: Variety.name, schema: VarietySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PlantsController],
  providers: [PlantsService, PlantHistoryService],
  exports: [PlantsService, PlantHistoryService],
})
export class PlantsModule {}
