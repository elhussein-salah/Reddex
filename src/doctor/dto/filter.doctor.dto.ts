import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FilterDoctorDto {
  @ApiPropertyOptional({
    description: 'Search by full name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
