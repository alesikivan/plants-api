import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiRecognitionLogDocument = AiRecognitionLog & Document;

@Schema({ collection: 'ai_recognition_logs', timestamps: true })
export class AiRecognitionLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  userName?: string;

  @Prop({ required: true, enum: ['genus', 'variety'], index: true })
  type: 'genus' | 'variety';

  @Prop({ required: true })
  query: string;

  @Prop({ required: true, index: true })
  recognized: boolean;

  @Prop({ required: false, default: '' })
  resultNameRu: string;

  @Prop({ required: false, default: '' })
  resultNameEn: string;

  // For variety recognition: which genus was used as context
  @Prop({ type: Types.ObjectId, ref: 'Genus', required: false })
  genusId?: Types.ObjectId;

  @Prop({ required: false })
  genusNameRu?: string;

  @Prop({ required: false })
  genusNameEn?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AiRecognitionLogSchema = SchemaFactory.createForClass(AiRecognitionLog);

// Compound indexes for common query patterns
// List query: filter by type+recognized, sort by createdAt desc
AiRecognitionLogSchema.index({ type: 1, recognized: 1, createdAt: -1 });
// Stats period queries: filter by createdAt
AiRecognitionLogSchema.index({ createdAt: -1 });
// Stats by type+recognized counts
AiRecognitionLogSchema.index({ type: 1, recognized: 1 });
