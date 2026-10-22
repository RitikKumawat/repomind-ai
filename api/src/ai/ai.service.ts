import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  constructor(private readonly httpService: HttpService) {}

  async isHealthy(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          (process.env.AI_SERVICE_URL || 'http://localhost:8000') + '/health',
          { timeout: 1500 },
        ),
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async ingestRepository(
    repoId: string,
    githubUrl: string,
    githubToken?: string,
    defaultBranch?: string,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        (process.env.AI_SERVICE_URL || 'http://localhost:8000') + '/ai/ingest',
        { repoId, githubUrl, githubToken, defaultBranch },
      ),
    );
  }

  async chat(
    repoId: string,
    message: string,
  ): Promise<Record<string, unknown>> {
    const response = await firstValueFrom(
      this.httpService.post<Record<string, unknown>>(
        (process.env.AI_SERVICE_URL || 'http://localhost:8000') + '/ai/chat',
        { repoId, message },
      ),
    );

    return response.data;
  }
}
