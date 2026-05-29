import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create.patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  profilePicture?: any;
}
