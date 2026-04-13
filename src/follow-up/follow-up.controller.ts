import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
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
import { Role } from '../enums/role';
import type { AuthenticatedRequest } from '../common/interfaces/AuthenticatedRequest';

@ApiTags('Follow-Ups')
@ApiBearerAuth()
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
  async getDoctorPendingRequests(@Req() req: AuthenticatedRequest) {
    return this.followUpService.getDoctorPendingRequests(req.user.sub);
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
  @Patch(':id/cancel')
  async cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.followUpService.cancelRequest(req.user.sub, id);
  }
}
