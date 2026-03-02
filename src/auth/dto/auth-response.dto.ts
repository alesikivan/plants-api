import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  user: UserResponseDto;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
