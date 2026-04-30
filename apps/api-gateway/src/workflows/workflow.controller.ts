import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { WorkflowQueueService } from '../queue/workflow-queue.service';
import { CreateWorkflowRequestDto } from './create-workflow-request.dto';
import { WorkflowIntakeResponseDto } from './workflow-intake-response.dto';
import { WorkflowRepository } from './workflow.repository';
import { WorkflowStatusDto } from './workflow-status.dto';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowQueueService: WorkflowQueueService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: WorkflowIntakeResponseDto })
  async createWorkflow(
    @Body() payload: CreateWorkflowRequestDto,
  ): Promise<WorkflowIntakeResponseDto> {
    const created = await this.workflowRepository.createWorkflowRequest(payload);

    await this.workflowQueueService.enqueue({
      workflowRequestId: created.id,
      externalId: created.externalId,
      patientContext: payload.patientContext,
      containsSensitiveData: payload.containsSensitiveData ?? true,
    });

    return created;
  }

  @Get(':id')
  @ApiOkResponse({ type: WorkflowStatusDto })
  async getWorkflowStatus(@Param('id') id: string): Promise<WorkflowStatusDto> {
    const status = await this.workflowRepository.getWorkflowStatus(id);

    if (!status) {
      throw new NotFoundException(`Workflow ${id} was not found.`);
    }

    return status;
  }
}
