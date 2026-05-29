import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject } from 'class-validator';

export class CreateResultDto {
  @ApiProperty({
    example: 1,
    description: 'The ID of the patient this result belongs to',
  })
  @IsInt()
  @IsNotEmpty()
  patientId: number;

  @ApiProperty({
    example: { cholesterol: '200 mg/dL', glucose: '90 mg/dL' },
    description: 'The result data in JSON format',
  })
  @IsObject()
  @IsNotEmpty()
  result: any;
}
