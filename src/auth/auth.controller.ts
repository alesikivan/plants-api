import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Res, Get, Query } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { getAuthCookieOptions, getClearCookieOptions } from './cookie.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ requiresVerification: true }> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    await this.authService.verifyEmail(token);
    return { message: 'Email успешно подтверждён' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }): Promise<{ message: string }> {
    await this.authService.resendVerification(body.email);
    return { message: 'Если аккаунт существует, письмо отправлено' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.password);
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
    response.cookie('accessToken', result.accessToken, getAuthCookieOptions('access'));

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

    // Clear cookies with same options used when setting them
    const clearOptions = getClearCookieOptions();
    response.clearCookie('accessToken', clearOptions);
    response.clearCookie('refreshToken', clearOptions);

    return { message: 'Logout successful' };
  }

  // Public endpoint to clear session cookies (used when session is invalidated on client side)
  @Post('clear-session')
  @Public()
  @HttpCode(HttpStatus.OK)
  clearSession(@Res({ passthrough: true }) response: Response): { message: string } {
    const clearOptions = getClearCookieOptions();
    response.clearCookie('accessToken', clearOptions);
    response.clearCookie('refreshToken', clearOptions);
    return { message: 'Session cleared' };
  }

  // Helper method to set auth cookies
  private setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    response.cookie('accessToken', accessToken, getAuthCookieOptions('access'));
    response.cookie('refreshToken', refreshToken, getAuthCookieOptions('refresh'));
  }
}
