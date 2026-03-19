import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShelfDocument = Shelf & Document;

@Schema({ timestamps: true, collection: 'shelves' })
export class Shelf {
  @Prop({ required: true })
  name: string;

  @Prop()
  photo?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Plant' }], default: [] })
  plantIds: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ShelfSchema = SchemaFactory.createForClass(Shelf);

// Индекс для оптимизации запросов по растениям
ShelfSchema.index({ plantIds: 1, userId: 1 });
