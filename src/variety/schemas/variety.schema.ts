import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VarietyDocument = Variety & Document;

@Schema({ timestamps: true, collection: 'varieties' })
export class Variety {
  @Prop({ required: true })
  nameRu: string;

  @Prop({ required: true })
  nameEn: string;

  @Prop({ type: Types.ObjectId, ref: 'Genus', required: true })
  genusId: Types.ObjectId;

  @Prop()
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const VarietySchema = SchemaFactory.createForClass(Variety);

// Создаем индексы для поиска
VarietySchema.index({ nameRu: 'text', nameEn: 'text' });
// Создаем составной индекс для уникальности комбинации nameRu + nameEn + genusId
VarietySchema.index({ nameRu: 1, nameEn: 1, genusId: 1 }, { unique: true });
