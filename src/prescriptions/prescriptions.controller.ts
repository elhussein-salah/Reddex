import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../auth/roles.decorator';
import { ActiveFollowUpGuard } from './guards/active-follow-up.guard';
import type { AuthenticatedRequest } from '../common/interfaces/AuthenticatedRequest';
import { Role } from '../enums';
import { CreatePrescriptionDto, UpdatePrescriptionDto } from './dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Prescriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // @Get('me')
  // @Roles(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  // @ApiOperation({
  //   summary: 'Get prescriptions for the logged-in patient (paginated)',
  // })
  // findMyPrescriptions(
  //   @Req() req: AuthenticatedRequest,
  //   @Query() pagination: PaginationDto,
  // ) {
  //   return this.prescriptionsService.getMyPrescriptions(
  //     req.user.sub,
  //     pagination,
  //   );
  // }

  @Get('me/medications')
  @Roles(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Get all medications for the logged-in patient',
  })
  findMyMedications(@Req() req: AuthenticatedRequest) {
    return this.prescriptionsService.getMyMedications(req.user.sub);
  }

  @Get('patient/:patientId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary: 'Get all prescriptions for a patient by patient ID',
  })
  findByPatientId(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.prescriptionsService.getPatientPrescriptions(patientId);
  }

  @Post()
  @Roles(Role.DOCTOR)
  @UseGuards(ActiveFollowUpGuard)
  @ApiOperation({
    summary: 'Create a prescription for a patient with an active follow-up',
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePrescriptionDto) {
    const activeFollowUpId = (req as any).activeFollowUpId as
      | number
      | undefined;
    return this.prescriptionsService.createPrescription(
      req.user.sub,
      dto,
      activeFollowUpId,
    );
  }

  @Put(':id')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: 'Update a prescription and reschedule its reminders',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.updatePrescription(req.user.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete a prescription by its ID',
  })
  delete(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.prescriptionsService.deletePrescription(
      id,
      req.user.sub,
      req.user.role,
    );
  }
}
