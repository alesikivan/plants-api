import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Plant, PlantSchema } from '../plants/schemas/plant.schema';
import { Shelf, ShelfSchema } from '../shelves/schemas/shelf.schema';
import { PlantHistory, PlantHistorySchema } from '../plants/schemas/plant-history.schema';
import { Wishlist, WishlistSchema } from '../wishlist/schemas/wishlist.schema';
import { Follow, FollowSchema } from '../follows/schemas/follow.schema';
import { Bookmark, BookmarkSchema } from '../bookmarks/schemas/bookmark.schema';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TelegramModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Plant.name, schema: PlantSchema },
      { name: Shelf.name, schema: ShelfSchema },
      { name: PlantHistory.name, schema: PlantHistorySchema },
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Bookmark.name, schema: BookmarkSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
