import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreatePatientDto } from './dto/create.patient.dto';
import { UpdatePatientDto } from './dto/update.patient.dto';
import { PatientsService } from './patients.service';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import { RolesGuard } from 'src/auth/role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';
import { imageFileFilter } from 'src/common/utils/file-filter.util';

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PATIENT, Role.DOCTOR)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a patient' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreatePatientDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.patientsService.createPatient(dto, file);
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
  @Roles(Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'Update patient by ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'Delete patient by ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.deletePatient(id);
  }
}
