import { IsOptional, IsBoolean } from 'class-validator';

export class GetInsightQueryDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export interface EndpointParamDoc {
  name: string;
  in: 'path' | 'query' | 'body' | 'header';
  type: string;
  required: boolean;
  description?: string;
}

export interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  path: string;
  summary: string;
  description?: string;
  authRequired?: boolean;
  authType?: string;
  handler?: string;
  parameters?: EndpointParamDoc[];
  requestBodySchema?: string | Record<string, unknown>;
  responseSchema?: string | Record<string, unknown>;
  filePath: string;
  startLine: number;
  endLine: number;
}

export interface ArchitectureModuleDoc {
  name: string;
  type: string;
  description: string;
  files: string[];
}

export interface ArchitectureDoc {
  overview: string;
  systemType: string;
  frameworks: string[];
  techStack: string[];
  mermaidDiagram: string;
  modules: ArchitectureModuleDoc[];
  keyWorkflows: { title: string; steps: string[] }[];
}

export interface OnboardingDoc {
  summary: string;
  prerequisites: string[];
  setupSteps: {
    step: number;
    title: string;
    command?: string;
    description: string;
  }[];
  envVariables: {
    name: string;
    required: boolean;
    description: string;
    defaultValue?: string;
  }[];
  architectureNotes: string;
  recommendedEntrypoints: { path: string; purpose: string }[];
}
