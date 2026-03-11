import { SocialLink } from '../schemas/user.schema';

export class UserProfileWithStatsDto {
  id: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  preferredLanguage?: string;
  showPlants: boolean;
  showShelves: boolean;
  showPlantHistory: boolean;
  bio?: string;
  avatar?: string;
  socialLinks?: SocialLink[];
  stats: {
    totalPlants: number;
    totalShelves: number;
    followersCount: number;
  };

  constructor(data: Partial<UserProfileWithStatsDto>) {
    Object.assign(this, data);
  }
}
