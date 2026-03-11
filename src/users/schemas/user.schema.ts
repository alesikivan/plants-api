import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

export interface SocialLink {
  type: string;
  value: string;
  isPublic: boolean;
}

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

  @Prop({ type: Boolean, default: true })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken?: string;

  @Prop({ type: Date, default: null })
  emailVerificationExpires?: Date;

  @Prop({ type: String })
  avatar?: string;

  @Prop({ type: String, default: null })
  passwordResetToken?: string;

  @Prop({ type: Date, default: null })
  passwordResetExpires?: Date;

  @Prop({ type: String, default: null, maxlength: 80 })
  bio?: string;

  @Prop({
    type: [
      {
        type: { type: String },
        value: { type: String },
        isPublic: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  socialLinks?: SocialLink[];

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
