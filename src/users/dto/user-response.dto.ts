import { Role } from '../../common/enums/role.enum';
import { SocialLink } from '../schemas/user.schema';
import { DeviceInfo } from '../../common/utils/device';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredLanguage: string;
  showPlants: boolean;
  showShelves: boolean;
  showPlantHistory: boolean;
  showWishlist: boolean;
  isBlocked: boolean;
  telegramPublishPlants: boolean;
  telegramPublishHistory: boolean;
  telegramBannerDismissed: boolean;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLink[];
  // Admin listing only
  registrationDevice?: DeviceInfo | null;
  lastDevice?: DeviceInfo | null;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
