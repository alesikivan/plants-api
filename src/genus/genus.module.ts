import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GenusService } from './genus.service';
import { GenusController } from './genus.controller';
import { Genus, GenusSchema } from './schemas/genus.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Genus.name, schema: GenusSchema }]),
    AiModule,
  ],
  controllers: [GenusController],
  providers: [GenusService],
  exports: [GenusService],
})
export class GenusModule {}
