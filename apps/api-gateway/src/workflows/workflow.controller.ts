import { Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { WorkflowRecordDto } from './workflow-record.dto';
import { WorkflowRepository } from './workflow.repository';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  @Post('seed')
  @ApiCreatedResponse({ type: WorkflowRecordDto })
  createSeedRecord(): Promise<WorkflowRecordDto> {
    return this.workflowRepository.createSeedRecord();
  }
}
