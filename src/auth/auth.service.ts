import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserDocument } from '../users/schemas/user.schema';

// Internal interface for passing tokens to controller
interface AuthResult {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create(registerDto);
    const tokens = await this.generateTokens({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Ваш аккаунт заблокирован');
    }

    const tokens = await this.generateTokens({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(userId: string, refreshToken: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Недействительный токен обновления');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Ваш аккаунт заблокирован');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Недействительный токен обновления');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiration'),
    });

    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async generateTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiration'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiration'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
