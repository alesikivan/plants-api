import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop()
  refreshToken?: string;

  @Prop({ type: String, enum: ['ru', 'en'], default: 'ru' })
  preferredLanguage: string;

  @Prop({ type: Boolean, default: true })
  showPlants: boolean;

  @Prop({ type: Boolean, default: true })
  showShelves: boolean;

  @Prop({ type: Boolean, default: true })
  showPlantHistory: boolean;

  @Prop({ type: Boolean, default: false })
  isBlocked: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
