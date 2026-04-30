import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { WorkflowRepository } from '../workflows/workflow.repository';
import { WORKFLOW_QUEUE } from './workflow-queue.constants';
import { WorkflowJobData } from './workflow-job.data';

@Injectable()
export class WorkflowQueueWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<WorkflowJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly workflowRepository: WorkflowRepository,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<WorkflowJobData>(
      WORKFLOW_QUEUE,
      async (job) => {
        await this.workflowRepository.processWorkflow(job.data);
      },
      {
        connection: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
        },
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
