import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { GithubProfile, AuthenticatedUser } from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(
    email: string,
    pass: string,
  ): Promise<{ access_token: string; user: AuthenticatedUser }> {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(pass, salt);

    const user = this.usersRepository.create({
      email,
      passwordHash,
    });

    await this.usersRepository.save(user);

    return this.generateToken(user);
  }

  async login(
    email: string,
    pass: string,
  ): Promise<{ access_token: string; user: AuthenticatedUser }> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Invalid credentials (or user uses OAuth)',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async githubLogin(
    reqUser: GithubProfile,
  ): Promise<{ access_token: string; user: AuthenticatedUser }> {
    if (!reqUser) {
      throw new UnauthorizedException('No user from github');
    }

    let user = await this.usersRepository.findOne({
      where: { githubId: reqUser.id },
    });

    const email =
      reqUser.emails && reqUser.emails.length > 0
        ? reqUser.emails[0].value
        : null;

    if (!user) {
      // Check if email exists
      if (email) {
        user = await this.usersRepository.findOne({ where: { email } });
      }

      if (user) {
        // Link github ID
        user.githubId = reqUser.id;
        await this.usersRepository.save(user);
      } else {
        // Create new user
        user = this.usersRepository.create({
          email: email || `${reqUser.id}@github.com`,
          githubId: reqUser.id,
        });
        await this.usersRepository.save(user);
      }
    }

    return this.generateToken(user);
  }

  async saveUserGithubRepoToken(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (user) {
      user.githubAccessToken = accessToken;
      user.isGithubRepoConnected = true;
      await this.usersRepository.save(user);
    }
  }

  async getUserProfile(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      githubId: user.githubId,
      isGithubRepoConnected: user.isGithubRepoConnected,
    };
  }

  private generateToken(user: User): {
    access_token: string;
    user: AuthenticatedUser;
  } {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        githubId: user.githubId,
        isGithubRepoConnected: user.isGithubRepoConnected,
      },
    };
  }
}
