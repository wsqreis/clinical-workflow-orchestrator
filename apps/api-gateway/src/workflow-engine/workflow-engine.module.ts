import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WorkflowEngineClient } from './workflow-engine.client';

@Module({
  imports: [HttpModule],
  providers: [WorkflowEngineClient],
  exports: [WorkflowEngineClient],
})
export class WorkflowEngineModule {}
