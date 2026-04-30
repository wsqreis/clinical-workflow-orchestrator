import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { WorkflowRepository } from '../workflows/workflow.repository';
import { AuditEventDto } from './audit-event.dto';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  @Get('workflows/:externalId')
  @ApiOkResponse({ type: AuditEventDto, isArray: true })
  getWorkflowAuditTrail(
    @Param('externalId') externalId: string,
  ): Promise<AuditEventDto[]> {
    return this.workflowRepository.listAuditEvents(externalId);
  }
}
