import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);

    // Set httpOnly cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    // Return only user data (without tokens)
    return new AuthResponseDto({
      user: this.authService['usersService'].toResponseDto(result.user),
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookies
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    // Return only user data (without tokens)
    return new AuthResponseDto({
      user: this.authService['usersService'].toResponseDto(result.user),
    });
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() payload: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const result = await this.authService.refresh(payload.sub, payload.refreshToken);

    // Update only access token in cookie
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    return { message: 'Token refreshed successfully' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user._id.toString());

    // Clear cookies
    response.clearCookie('accessToken', { path: '/' });
    response.clearCookie('refreshToken', { path: '/' });

    return { message: 'Logout successful' };
  }

  // Public endpoint to clear session cookies (used when session is invalidated on client side)
  @Post('clear-session')
  @Public()
  @HttpCode(HttpStatus.OK)
  clearSession(@Res({ passthrough: true }) response: Response): { message: string } {
    response.clearCookie('accessToken', { path: '/' });
    response.clearCookie('refreshToken', { path: '/' });
    return { message: 'Session cleared' };
  }

  // Helper method to set auth cookies
  private setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    // Access token - short lifetime (15 minutes)
    response.cookie('accessToken', accessToken, {
      httpOnly: true, // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'lax', // CSRF protection
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Refresh token - long lifetime (7 days)
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
