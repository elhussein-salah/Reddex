import { PartialType } from '@nestjs/swagger';
import { CreateLabReportDto } from './create-lab-report.dto';
export class UpdateLabReportDto extends PartialType(CreateLabReportDto) {}
