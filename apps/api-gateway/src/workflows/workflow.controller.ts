import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateWorkflowRequestDto } from './create-workflow-request.dto';
import { WorkflowIntakeResponseDto } from './workflow-intake-response.dto';
import { WorkflowRepository } from './workflow.repository';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  @Post()
  @ApiCreatedResponse({ type: WorkflowIntakeResponseDto })
  createWorkflow(
    @Body() payload: CreateWorkflowRequestDto,
  ): Promise<WorkflowIntakeResponseDto> {
    return this.workflowRepository.createWorkflow(payload);
  }
}
