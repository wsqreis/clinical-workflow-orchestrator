import { ApiProperty } from '@nestjs/swagger';

export class WorkflowRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: string;
}
