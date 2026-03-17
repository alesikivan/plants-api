import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationType = 'new_follower' | 'new_bookmark';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: NotificationType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  data: Record<string, string>;

  @Prop({ default: false })
  isRead: boolean;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
