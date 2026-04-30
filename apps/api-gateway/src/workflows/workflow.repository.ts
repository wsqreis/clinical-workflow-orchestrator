import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';
import { WorkflowEngineClient } from '../workflow-engine/workflow-engine.client';
import { CreateWorkflowRequestDto } from './create-workflow-request.dto';
import { WorkflowIntakeResponseDto } from './workflow-intake-response.dto';

@Injectable()
export class WorkflowRepository {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly workflowEngineClient: WorkflowEngineClient,
  ) {}

  async createWorkflow(
    payload: CreateWorkflowRequestDto,
  ): Promise<WorkflowIntakeResponseDto> {
    const workflowRequestId = randomUUID();
    const workflowRunId = randomUUID();
    const auditEventId = randomUUID();
    const containsSensitiveData = payload.containsSensitiveData ?? true;
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await this.insertWorkflowRequest(client, {
        workflowRequestId,
        externalId: payload.externalId,
        patientContext: payload.patientContext,
        containsSensitiveData,
      });

      const evaluation = await this.workflowEngineClient.evaluateWorkflow({
        workflow_id: workflowRequestId,
        patient_context: payload.patientContext,
        contains_sensitive_data: containsSensitiveData,
      });

      await this.insertWorkflowRun(client, {
        workflowRunId,
        workflowRequestId,
        status: evaluation.status,
      });

      await this.insertModelResponse(client, {
        workflowRunId,
        provider: 'workflow-engine',
        summary: evaluation.summary,
      });

      const result = await client.query<{
        external_id: string;
        created_at: Date;
      }>(
        `INSERT INTO audit_events (id, workflow_request_id, event_type, payload)
         VALUES ($1, $2, $3, $4)
         RETURNING (
           SELECT external_id FROM workflow_requests WHERE id = $2
         ) AS external_id,
         created_at`,
        [
          auditEventId,
          workflowRequestId,
          'workflow_request.created',
          JSON.stringify({
            source: 'api-gateway',
            runId: workflowRunId,
            recommendedActions: evaluation.recommended_actions,
          }),
        ],
      );

      await client.query('COMMIT');

      const row = result.rows[0];

      return {
        id: workflowRequestId,
        externalId: row.external_id,
        status: evaluation.status,
        recommendedActions: evaluation.recommended_actions,
        createdAt: row.created_at.toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertWorkflowRequest(
    client: PoolClient,
    payload: {
      workflowRequestId: string;
      externalId: string;
      patientContext: string;
      containsSensitiveData: boolean;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO workflow_requests (id, external_id, patient_context, contains_sensitive_data)
       VALUES ($1, $2, $3, $4)`,
      [
        payload.workflowRequestId,
        payload.externalId,
        payload.patientContext,
        payload.containsSensitiveData,
      ],
    );
  }

  private async insertWorkflowRun(
    client: PoolClient,
    payload: {
      workflowRunId: string;
      workflowRequestId: string;
      status: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO workflow_runs (id, workflow_request_id, status)
       VALUES ($1, $2, $3)`,
      [payload.workflowRunId, payload.workflowRequestId, payload.status],
    );
  }

  private async insertModelResponse(
    client: PoolClient,
    payload: {
      workflowRunId: string;
      provider: string;
      summary: string;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO model_responses (id, workflow_run_id, provider, summary)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), payload.workflowRunId, payload.provider, payload.summary],
    );
  }
}
