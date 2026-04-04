import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

@Schema({ timestamps: true, collection: 'wishlist' })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'Genus', required: true })
  genusId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Variety' })
  varietyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop()
  photo?: string;

  @Prop({ type: String, maxlength: 60 })
  note?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

// Индекс для оптимизации запросов
WishlistSchema.index({ userId: 1 });
