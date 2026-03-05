import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlantDocument = Plant & Document;

@Schema({ timestamps: true, collection: 'plants' })
export class Plant {
  @Prop({ type: Types.ObjectId, ref: 'Genus', required: true })
  genusId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Variety' })
  varietyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Shelf' }], default: [] })
  shelfIds: Types.ObjectId[];

  @Prop()
  purchaseDate?: Date;

  @Prop()
  photo?: string;

  @Prop()
  description?: string;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  createdAt: Date;
  updatedAt: Date;
}

export const PlantSchema = SchemaFactory.createForClass(Plant);

// Индекс для оптимизации запросов по полкам
PlantSchema.index({ shelfIds: 1, userId: 1 });
