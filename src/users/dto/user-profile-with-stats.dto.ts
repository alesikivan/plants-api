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
  avatar?: string;
  stats: {
    totalPlants: number;
    totalShelves: number;
  };

  constructor(data: Partial<UserProfileWithStatsDto>) {
    Object.assign(this, data);
  }
}
