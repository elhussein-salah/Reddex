import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FilterDoctorDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by full name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
