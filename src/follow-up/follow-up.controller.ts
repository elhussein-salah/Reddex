import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FollowUpService } from './follow-up.service';
import { CreateFollowUpDto, RespondFollowUpDto } from './dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/role.guard';
import { Roles } from '../auth/roles.decorator';
import { FilterDoctorDto } from '../doctor/dto/filter.doctor.dto';
import { Role } from '../enums/role';
import type { AuthenticatedRequest } from '../common/interfaces/AuthenticatedRequest';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Follow-Ups')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('follow-up')
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @ApiOperation({ summary: 'Create a new follow-up request (Patient)' })
  @Roles(Role.PATIENT)
  @Post()
  async createRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.followUpService.createRequest(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'List all PENDING requests for the logged-in doctor',
  })
  @Roles(Role.DOCTOR)
  @Get('doctor')
  async getDoctorPendingRequests(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    return this.followUpService.getDoctorPendingRequests(
      req.user.sub,
      pagination,
    );
  }

  @ApiOperation({
    summary: 'List all patients followed by the logged-in doctor',
  })
  @Roles(Role.DOCTOR)
  @Get('doctor/patients')
  async getDoctorPatients(@Req() req: AuthenticatedRequest) {
    return this.followUpService.getDoctorPatients(req.user.sub);
  }

  @ApiOperation({
    summary: 'List all doctors followed by the logged-in patient',
  })
  @Roles(Role.PATIENT)
  @Get('patient/doctors')
  async getPatientDoctors(@Req() req: AuthenticatedRequest) {
    return this.followUpService.getPatientDoctors(req.user.sub);
  }

  @ApiOperation({
    summary: 'List all doctors with follow-up status for the logged-in patient',
  })
  @Roles(Role.PATIENT)
  @Get('patient/doctors-status')
  async getDoctorsWithFollowUpStatus(
    @Req() req: AuthenticatedRequest,
    @Query() filter: FilterDoctorDto,
  ) {
    return this.followUpService.getDoctorsWithFollowUpStatus(
      req.user.sub,
      filter,
    );
  }

  @ApiOperation({ summary: 'Accept or Reject a follow-up request (Doctor)' })
  @Roles(Role.DOCTOR)
  @Patch(':id/respond')
  async respondToRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondFollowUpDto,
  ) {
    return this.followUpService.respondToRequest(req.user.sub, id, dto.status);
  }

  @ApiOperation({ summary: 'Cancel a PENDING follow-up request (Patient)' })
  @Roles(Role.PATIENT)
  @Patch('cancel/:doctorId')
  async cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('doctorId', ParseIntPipe) doctorId: number,
  ) {
    return this.followUpService.cancelRequest(req.user.sub, doctorId);
  }
}
