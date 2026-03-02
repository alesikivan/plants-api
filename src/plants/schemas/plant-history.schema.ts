import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlantHistoryDocument = PlantHistory & Document;

@Schema({ timestamps: true, collection: 'plant_history' })
export class PlantHistory {
  @Prop({ type: Types.ObjectId, ref: 'Plant', required: true })
  plantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: false })
  comment: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const PlantHistorySchema = SchemaFactory.createForClass(PlantHistory);

// Индекс для оптимизации запросов по растению и пользователю
PlantHistorySchema.index({ plantId: 1, userId: 1, date: -1 });
