import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GenusDocument = Genus & Document;

@Schema({ timestamps: true, collection: 'genuses' })
export class Genus {
  @Prop({ required: true })
  nameRu: string;

  @Prop({ required: true })
  nameEn: string;

  @Prop()
  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GenusSchema = SchemaFactory.createForClass(Genus);

// Создаем индексы для поиска
GenusSchema.index({ nameRu: 'text', nameEn: 'text' });
// Уникальный составной индекс
GenusSchema.index({ nameRu: 1, nameEn: 1 }, { unique: true });
