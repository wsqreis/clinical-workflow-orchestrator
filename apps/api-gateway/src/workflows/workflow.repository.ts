import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { AuditEventDto } from '../audit/audit-event.dto';
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

      const evaluation = await this.workflowEngineClient.evaluateWorkflow({
        workflow_id: workflowRequestId,
        patient_context: payload.patientContext,
        contains_sensitive_data: containsSensitiveData,
      });

      await this.insertWorkflowRequest(client, {
        workflowRequestId,
        externalId: payload.externalId,
        patientContext: payload.patientContext,
        containsSensitiveData,
        privacyReviewRequired: evaluation.privacy_review_required,
        redactionCount: evaluation.redaction_count,
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
            privacyReviewRequired: evaluation.privacy_review_required,
            redactionCount: evaluation.redaction_count,
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

  async listAuditEvents(externalId: string): Promise<AuditEventDto[]> {
    const result = await this.pool.query<{
      event_type: string;
      created_at: Date;
      payload: Record<string, unknown>;
    }>(
      `SELECT ae.event_type, ae.created_at, ae.payload
       FROM audit_events ae
       INNER JOIN workflow_requests wr ON wr.id = ae.workflow_request_id
       WHERE wr.external_id = $1
       ORDER BY ae.created_at ASC`,
      [externalId],
    );

    return result.rows.map((row) => ({
      eventType: row.event_type,
      createdAt: row.created_at.toISOString(),
      payload: row.payload,
    }));
  }

  private async insertWorkflowRequest(
    client: PoolClient,
    payload: {
      workflowRequestId: string;
      externalId: string;
      patientContext: string;
      containsSensitiveData: boolean;
      privacyReviewRequired: boolean;
      redactionCount: number;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO workflow_requests (
         id,
         external_id,
         patient_context,
         contains_sensitive_data,
         retention_expires_at,
         privacy_review_required,
         redaction_count
       )
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days', $5, $6)`,
      [
        payload.workflowRequestId,
        payload.externalId,
        payload.patientContext,
        payload.containsSensitiveData,
        payload.privacyReviewRequired,
        payload.redactionCount,
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
