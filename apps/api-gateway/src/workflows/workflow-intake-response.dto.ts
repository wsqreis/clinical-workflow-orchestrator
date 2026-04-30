import { ApiProperty } from '@nestjs/swagger';

export class WorkflowIntakeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [String] })
  recommendedActions!: string[];

  @ApiProperty()
  createdAt!: string;
}
