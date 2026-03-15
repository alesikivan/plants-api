import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookmarkDocument = Bookmark & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Bookmark {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['plant', 'plant_history'], required: true })
  itemType: 'plant' | 'plant_history';

  @Prop({ type: Types.ObjectId, required: true })
  itemId: Types.ObjectId;

  createdAt: Date;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

BookmarkSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });
