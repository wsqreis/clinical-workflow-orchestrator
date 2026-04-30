import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WORKFLOW_QUEUE_TOKEN } from './workflow-queue.constants';
import { WorkflowJobData } from './workflow-job.data';

@Injectable()
export class WorkflowQueueService implements OnModuleDestroy {
  constructor(
    @Inject(WORKFLOW_QUEUE_TOKEN) private readonly queue: Queue<WorkflowJobData>,
  ) {}

  enqueue(data: WorkflowJobData): Promise<void> {
    return this.queue
      .add('process-workflow', data, {
        removeOnComplete: true,
        removeOnFail: false,
      })
      .then(() => undefined);
  }

  onModuleDestroy(): Promise<void> {
    return this.queue.close();
  }
}
