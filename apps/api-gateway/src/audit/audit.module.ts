import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflows/workflow.module';
import { AuditController } from './audit.controller';

@Module({
  imports: [WorkflowModule],
  controllers: [AuditController],
})
export class AuditModule {}
