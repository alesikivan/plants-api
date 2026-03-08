import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { TelegramService } from '../telegram/telegram.service';
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
    private mailerService: MailerService,
    private telegramService: TelegramService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ requiresVerification: true }> {
    const { user, verificationToken } = await this.usersService.create(registerDto);
    const frontendUrl = this.configService.get<string>('frontendUrl') || process.env.FRONTEND_URL;

    try {
      if (verificationToken) {
        await this.mailerService.sendVerificationEmail(user.email, verificationToken, frontendUrl);
      }
    } catch (err) {
      // Log email send failure but don't fail registration
      console.error('Failed to send verification email:', err);
    }

    this.telegramService.notifyUserRegistered(user.name, user.email).catch(() => {});

    return { requiresVerification: true };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Ваш аккаунт заблокирован');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException({ message: 'Email не подтверждён', code: 'EMAIL_NOT_VERIFIED' });
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

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Недействительная или просроченная ссылка подтверждения');
    }
    await this.usersService.markEmailVerified(user._id.toString());
    this.telegramService.notifyEmailVerified(user.name, user.email).catch(() => {});
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Silently succeed to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return;
    }

    const token = await this.usersService.setNewVerificationToken(user._id.toString());
    const frontendUrl = this.configService.get<string>('frontendUrl') || process.env.FRONTEND_URL;

    try {
      await this.mailerService.sendVerificationEmail(user.email, token, frontendUrl);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
    }
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      const token = await this.usersService.setPasswordResetToken(user._id.toString());
      const frontendUrl = this.configService.get<string>('frontendUrl') || process.env.FRONTEND_URL;
      try {
        await this.mailerService.sendPasswordResetEmail(email, token, frontendUrl);
      } catch (err) {
        console.error('Failed to send password reset email:', err);
      }
    }
    return { message: 'If the account exists, an email was sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      throw new BadRequestException('Ссылка недействительна или устарела');
    }
    await this.usersService.resetPassword(user._id.toString(), newPassword);
    await this.usersService.updateRefreshToken(user._id.toString(), null);
    return { message: 'Password reset successfully' };
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
