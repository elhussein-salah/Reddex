import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LabResultDto {
  @ApiProperty({ example: 'Hb' })
  @IsString()
  name: string;

  @ApiProperty({ example: 13.5 })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ example: 'g/dL' })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateLabReportDto {
  @Transform(({ value }: { value: string }) => Number(value))
  @ApiProperty({ example: 1 })
  @IsNumber()
  patient_id: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  photo?: any;

  @ApiProperty({
    example: '[{"name":"Hb","value":13.5}]',
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return value;
    try {
      const parsed = JSON.parse(value) as LabResultDto[];
      return parsed.map((item: LabResultDto) =>
        plainToInstance(LabResultDto, {
          name: String(item.name),
          value: Number(item.value),
          unit: item.unit != null ? String(item.unit) : undefined,
        }),
      );
    } catch {
      return value; // Let class-validator report the error
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  results: LabResultDto[];
}
