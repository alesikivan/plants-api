import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShelvesService } from './shelves.service';
import { ShelvesController } from './shelves.controller';
import { Shelf, ShelfSchema } from './schemas/shelf.schema';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shelf.name, schema: ShelfSchema },
      { name: Plant.name, schema: PlantSchema },
    ]),
  ],
  controllers: [ShelvesController],
  providers: [ShelvesService],
  exports: [ShelvesService],
})
export class ShelvesModule {}
