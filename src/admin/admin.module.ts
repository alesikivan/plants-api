import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';
import { Shelf, ShelfSchema } from '../shelves/schemas/shelf.schema';
import { PlantHistory, PlantHistorySchema } from '../plants/schemas/plant-history.schema';
import { Genus, GenusSchema } from '../genus/schemas/genus.schema';
import { Variety, VarietySchema } from '../variety/schemas/variety.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Plant.name, schema: PlantSchema },
      { name: Shelf.name, schema: ShelfSchema },
      { name: PlantHistory.name, schema: PlantHistorySchema },
      { name: Genus.name, schema: GenusSchema },
      { name: Variety.name, schema: VarietySchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
