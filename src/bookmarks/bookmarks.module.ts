import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';
import { Bookmark, BookmarkSchema } from './schemas/bookmark.schema';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';
import { PlantHistory, PlantHistorySchema } from '../plants/schemas/plant-history.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bookmark.name, schema: BookmarkSchema },
      { name: Plant.name, schema: PlantSchema },
      { name: PlantHistory.name, schema: PlantHistorySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService, MongooseModule],
})
export class BookmarksModule {}
