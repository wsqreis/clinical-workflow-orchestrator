import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { AuditEventDto } from '../audit/audit-event.dto';
import { DATABASE_POOL } from '../database/database.constants';
import { WorkflowEngineClient } from '../workflow-engine/workflow-engine.client';
import { CreateWorkflowRequestDto } from './create-workflow-request.dto';
import { WorkflowIntakeResponseDto } from './workflow-intake-response.dto';
import { WorkflowStatusDto } from './workflow-status.dto';

@Injectable()
export class WorkflowRepository {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly workflowEngineClient: WorkflowEngineClient,
  ) {}

  async createWorkflowRequest(
    payload: CreateWorkflowRequestDto,
  ): Promise<WorkflowIntakeResponseDto> {
    const workflowRequestId = randomUUID();
    const containsSensitiveData = payload.containsSensitiveData ?? true;

    await this.pool.query(
      `INSERT INTO workflow_requests (
         id,
         external_id,
         patient_context,
         contains_sensitive_data,
         retention_expires_at,
         privacy_review_required,
         redaction_count
       )
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days', FALSE, 0)`,
      [
        workflowRequestId,
        payload.externalId,
        payload.patientContext,
        containsSensitiveData,
      ],
    );

    await this.pool.query(
      `INSERT INTO workflow_runs (id, workflow_request_id, status)
       VALUES ($1, $2, $3)`,
      [randomUUID(), workflowRequestId, 'queued'],
    );

    await this.pool.query(
      `INSERT INTO audit_events (id, workflow_request_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        randomUUID(),
        workflowRequestId,
        'workflow_request.queued',
        JSON.stringify({ source: 'api-gateway' }),
      ],
    );

    return {
      id: workflowRequestId,
      externalId: payload.externalId,
      status: 'queued',
      recommendedActions: [],
      createdAt: new Date().toISOString(),
    };
  }

  async processWorkflow(payload: {
    workflowRequestId: string;
    externalId: string;
    patientContext: string;
    containsSensitiveData: boolean;
  }): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const evaluation = await this.workflowEngineClient.evaluateWorkflow({
        workflow_id: payload.workflowRequestId,
        patient_context: payload.patientContext,
        contains_sensitive_data: payload.containsSensitiveData,
      });

      await client.query(
        `UPDATE workflow_requests
         SET privacy_review_required = $2,
             redaction_count = $3
         WHERE id = $1`,
        [
          payload.workflowRequestId,
          evaluation.privacy_review_required,
          evaluation.redaction_count,
        ],
      );

      const workflowRunId = randomUUID();
      await this.insertWorkflowRun(client, {
        workflowRunId,
        workflowRequestId: payload.workflowRequestId,
        status: evaluation.status,
      });

      await this.insertModelResponse(client, {
        workflowRunId,
        provider: 'workflow-engine',
        summary: evaluation.summary,
      });

      await client.query(
        `INSERT INTO audit_events (id, workflow_request_id, event_type, payload)
         VALUES ($1, $2, $3, $4)`,
        [
          randomUUID(),
          payload.workflowRequestId,
          'workflow_request.processed',
          JSON.stringify({
            source: 'queue-worker',
            recommendedActions: evaluation.recommended_actions,
            privacyReviewRequired: evaluation.privacy_review_required,
            redactionCount: evaluation.redaction_count,
          }),
        ],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getWorkflowStatus(id: string): Promise<WorkflowStatusDto | null> {
    const result = await this.pool.query<{
      id: string;
      external_id: string;
      status: string;
      summary: string | null;
      created_at: Date;
      recommended_actions: string[] | null;
    }>(
      `SELECT wr.id,
              wr.external_id,
              runs.status,
              mr.summary,
              wr.created_at,
              (
                SELECT ARRAY(
                  SELECT jsonb_array_elements_text(ae.payload->'recommendedActions')
                  FROM audit_events ae
                  WHERE ae.workflow_request_id = wr.id
                    AND ae.event_type = 'workflow_request.processed'
                  ORDER BY ae.created_at DESC
                  LIMIT 1
                )
              ) AS recommended_actions
       FROM workflow_requests wr
       LEFT JOIN LATERAL (
         SELECT status
         FROM workflow_runs
         WHERE workflow_request_id = wr.id
         ORDER BY created_at DESC
         LIMIT 1
       ) runs ON TRUE
       LEFT JOIN LATERAL (
         SELECT summary
         FROM model_responses mr
         INNER JOIN workflow_runs wrun ON wrun.id = mr.workflow_run_id
         WHERE wrun.workflow_request_id = wr.id
         ORDER BY mr.created_at DESC
         LIMIT 1
       ) mr ON TRUE
       WHERE wr.id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      externalId: row.external_id,
      status: row.status,
      recommendedActions: row.recommended_actions,
      summary: row.summary,
      createdAt: row.created_at.toISOString(),
    };
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
