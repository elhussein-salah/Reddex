import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Allowed sortable columns — whitelisted to prevent sorting by
 * sensitive fields (e.g. password) and Prisma schema leakage.
 */
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'id',
  'name',
  'email',
] as const;

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ALLOWED_SORT_COLUMNS,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_SORT_COLUMNS, {
    message: `sortBy must be one of: ${ALLOWED_SORT_COLUMNS.join(', ')}`,
  })
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], { message: 'sortOrder must be either asc or desc' })
  sortOrder: 'asc' | 'desc' = 'desc';

  /** Prisma `skip` value derived from page and limit */
  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }

  /** Prisma `take` value — same as limit */
  get take(): number {
    return this.limit ?? 20;
  }
}
