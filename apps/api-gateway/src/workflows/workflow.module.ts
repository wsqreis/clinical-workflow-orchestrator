import { Module } from '@nestjs/common';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { WorkflowController } from './workflow.controller';
import { WorkflowRepository } from './workflow.repository';

@Module({
  imports: [WorkflowEngineModule],
  controllers: [WorkflowController],
  providers: [WorkflowRepository],
})
export class WorkflowModule {}
