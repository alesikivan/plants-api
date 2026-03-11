import { Role } from '../../common/enums/role.enum';
import { SocialLink } from '../schemas/user.schema';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredLanguage: string;
  showPlants: boolean;
  showShelves: boolean;
  showPlantHistory: boolean;
  isBlocked: boolean;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLink[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
