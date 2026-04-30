import { ApiProperty } from '@nestjs/swagger';

export class WorkflowStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true, type: [String] })
  recommendedActions!: string[] | null;

  @ApiProperty({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  createdAt!: string;
}
