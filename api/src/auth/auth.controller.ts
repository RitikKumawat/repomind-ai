import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthDto } from './dto/auth.dto';
import type {
  GithubProfile,
  RequestWithUser,
} from './interfaces/auth.interfaces';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.register(
      body.email,
      body.password,
    );
    this.setCookie(res, access_token);
    return { message: 'Registered successfully', user };
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(
      body.email,
      body.password,
    );
    this.setCookie(res, access_token);
    return { message: 'Logged in successfully', user };
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates the GitHub OAuth flow
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(
    @Req() req: Request & { user: GithubProfile },
    @Res() res: Response,
  ) {
    const state = (req.query.state as string) || '';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (state.startsWith('connect:')) {
      const userId = state.replace('connect:', '');
      if (req.user.accessToken) {
        await this.authService.saveUserGithubRepoToken(
          userId,
          req.user.accessToken,
        );
      }
      return res.redirect(`${frontendUrl}/dashboard?github=connected`);
    }

    const { access_token } = await this.authService.githubLogin(req.user);
    this.setCookie(res, access_token);
    return res.redirect(`${frontendUrl}/dashboard`);
  }

  @Get('me')
  async getProfile(@Req() req: RequestWithUser) {
    const user = await this.authService.getUserProfile(req.user.id);
    return { user: user ?? req.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { message: 'Logged out successfully' };
  }

  private setCookie(res: Response, token: string) {
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }
}
