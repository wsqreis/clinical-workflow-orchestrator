import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowRepository } from './workflow.repository';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowRepository],
})
export class WorkflowModule {}
