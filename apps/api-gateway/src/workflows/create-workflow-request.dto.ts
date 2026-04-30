import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkflowRequestDto {
  @ApiProperty({ example: 'triage-encounter-001' })
  @IsString()
  @MinLength(1)
  externalId!: string;

  @ApiProperty({ example: 'Patient reports chest tightness and shortness of breath.' })
  @IsString()
  @MinLength(1)
  patientContext!: string;

  @ApiProperty({ example: true, default: true, required: false })
  @IsOptional()
  @IsBoolean()
  containsSensitiveData?: boolean;
}
