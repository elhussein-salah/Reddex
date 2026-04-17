import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LabReportService } from './lab-reports.service';
import { CreateLabReportDto } from './dto/create-lab-report.dto';
import { UpdateLabReportDto } from './dto/update-lab-report.dto';
import {
  ApiConsumes,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from 'src/common/utils/file-filter.util';
import { multerConfig } from 'src/common/config/multer.config';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import { RolesGuard } from 'src/auth/role.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';

@ApiTags('Lab Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.DOCTOR, Role.ADMIN, Role.PATIENT)
@Controller('lab-reports')
export class LabReportController {
  constructor(private readonly service: LabReportService) {}

  @Post()
  @ApiOperation({ summary: 'Create lab report with file + results' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patient_id: { type: 'number', example: 1 },
        photo: {
          type: 'string',
          format: 'binary',
        },
        results: {
          type: 'string',
          example: '[{"name":"Hb","value":13.5,"unit":"g/dL"}]',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreateLabReportDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, req.user!, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lab reports' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAll(req.user!);
  }

  @Get('patient/:patientId')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get all lab reports for one patient' })
  findAllForPatient(
    @Param('patientId') patientId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAllByPatientId(+patientId, req.user!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lab report by id' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.findOne(+id, req.user!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lab report' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
        results: {
          type: 'string',
          example: '[{"name":"Hb","value":14}]',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLabReportDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(+id, dto, req.user!, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lab report' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.remove(+id, req.user!);
  }
}
