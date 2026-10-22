export interface JwtPayload {
  email: string;
  sub: string;
}

export interface GithubProfile {
  id: string;
  emails?: Array<{ value: string }>;
  accessToken?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  githubId?: string;
  isGithubRepoConnected?: boolean;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
