import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreatePatientDto } from './dto/create.patient.dto';
import { PatientsService } from './patients.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import { RolesGuard } from 'src/auth/role.guard';

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a patient' })
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.createPatient(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  findAll() {
    return this.patientsService.getPatients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.getPatient(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient by ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreatePatientDto>,
  ) {
    return this.patientsService.updatePatient(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete patient by ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.deletePatient(id);
  }
}
