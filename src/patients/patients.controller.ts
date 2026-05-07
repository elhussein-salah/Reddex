import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Patients')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PATIENT, Role.DOCTOR)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
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
  findAll(@Query() paginationDto: PaginationDto) {
    return this.patientsService.getPatients(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by UserID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.getPatient(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'Update patient by UserID' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto) {
    return this.patientsService.updatePatient(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'Delete patient by UserID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.patientsService.deletePatient(id);
  }
}
