import { ApiProperty } from '@nestjs/swagger';

export class AuditEventDto {
  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  payload!: Record<string, unknown>;
}
