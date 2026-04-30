import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';
import { WorkflowRecordDto } from './workflow-record.dto';

@Injectable()
export class WorkflowRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async createSeedRecord(): Promise<WorkflowRecordDto> {
    const workflowRequestId = randomUUID();
    const workflowRunId = randomUUID();
    const auditEventId = randomUUID();

    await this.pool.query(
      `INSERT INTO workflow_requests (id, external_id, patient_context, contains_sensitive_data)
       VALUES ($1, $2, $3, $4)`,
      [
        workflowRequestId,
        `seed-${workflowRequestId.slice(0, 8)}`,
        'Initial seeded workflow for persistence validation.',
        true,
      ],
    );

    await this.pool.query(
      `INSERT INTO workflow_runs (id, workflow_request_id, status)
       VALUES ($1, $2, $3)`,
      [workflowRunId, workflowRequestId, 'accepted'],
    );

    const auditResult = await this.pool.query<{
      external_id: string;
      status: string;
      created_at: Date;
    }>(
      `INSERT INTO audit_events (id, workflow_request_id, event_type, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING (
         SELECT external_id FROM workflow_requests WHERE id = $2
       ) AS external_id,
       (
         SELECT status FROM workflow_runs WHERE id = $5
       ) AS status,
       created_at`,
      [
        auditEventId,
        workflowRequestId,
        'workflow_request.seeded',
        JSON.stringify({ source: 'api-gateway', runId: workflowRunId }),
        workflowRunId,
      ],
    );

    const row = auditResult.rows[0];

    return {
      id: workflowRequestId,
      externalId: row.external_id,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  }
}
