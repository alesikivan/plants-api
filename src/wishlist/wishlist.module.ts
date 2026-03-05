import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { Wishlist, WishlistSchema } from './schemas/wishlist.schema';
import { Genus, GenusSchema } from '../genus/schemas/genus.schema';
import { Variety, VarietySchema } from '../variety/schemas/variety.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Genus.name, schema: GenusSchema },
      { name: Variety.name, schema: VarietySchema },
    ]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
