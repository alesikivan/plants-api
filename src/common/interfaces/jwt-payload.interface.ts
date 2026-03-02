import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: Role;
}
