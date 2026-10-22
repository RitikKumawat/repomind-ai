import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { GithubProfile } from './interfaces/auth.interfaces';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    const options: StrategyOptions = {
      clientID:
        configService.get<string>('GITHUB_CLIENT_ID') || 'mock_client_id',
      clientSecret:
        configService.get<string>('GITHUB_CLIENT_SECRET') ||
        'mock_client_secret',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ||
        'http://localhost:4000/auth/github/callback',
      scope: ['user:email'],
    };
    super(options);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: unknown, user?: unknown, info?: unknown) => void,
  ) {
    const id = profile.id;
    const emails = profile.emails;
    const user: GithubProfile = {
      id,
      emails,
      accessToken,
    };
    done(null, user);
  }
}
