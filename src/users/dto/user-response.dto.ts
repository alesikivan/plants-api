import { Role } from '../../common/enums/role.enum';

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
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
