import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { WorkflowModule } from '../workflows/workflow.module';
import { WORKFLOW_QUEUE, WORKFLOW_QUEUE_TOKEN } from './workflow-queue.constants';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowQueueWorker } from './workflow-queue.worker';

@Global()
@Module({
  imports: [WorkflowModule],
  providers: [
    {
      provide: WORKFLOW_QUEUE_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Queue(WORKFLOW_QUEUE, {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        }),
    },
    WorkflowQueueService,
    WorkflowQueueWorker,
  ],
  exports: [WorkflowQueueService],
})
export class QueueModule {}
