import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type WorkflowEngineEvaluationResponse = {
  workflow_id: string;
  status: string;
  recommended_actions: string[];
  summary: string;
  redaction_count: number;
  privacy_review_required: boolean;
};

@Injectable()
export class WorkflowEngineClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async evaluateWorkflow(payload: {
    workflow_id: string;
    patient_context: string;
    contains_sensitive_data: boolean;
  }): Promise<WorkflowEngineEvaluationResponse> {
    const baseUrl = this.configService.get<string>(
      'WORKFLOW_ENGINE_URL',
      'http://localhost:8000',
    );

    const response = await firstValueFrom(
      this.httpService.post<WorkflowEngineEvaluationResponse>(
        `${baseUrl}/internal/workflows/evaluate`,
        payload,
      ),
    );

    return response.data;
  }
}
