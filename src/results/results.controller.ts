import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import type { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';
import { ProfileLookupService } from 'src/common/services/profile-lookup.service';

@ApiTags('Results')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly profileLookup: ProfileLookupService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Create a new result' })
  create(@Body() dto: CreateResultDto) {
    return this.resultsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PATIENT)
  @ApiOperation({ summary: 'my results (patient)' })
  findAll(@Req() req: AuthenticatedRequest) {
    if (req.user.role === Role.PATIENT) {
      return this.resultsService.findMyResults(req.user.sub);
    }
    return this.resultsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get a result by ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.resultsService.findOne(id);

    if (req.user.role === Role.PATIENT) {
      const patientId = await this.profileLookup.getPatientIdByUserId(
        req.user.sub,
      );
      if (result.patientId !== patientId) {
        throw new ForbiddenException('You are not allowed to view this result');
      }
    }

    return result;
  }

  @Get('patient/:userId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary: 'Get all results for a specific patient via user ID',
  })
  findByPatient(@Param('userId', ParseIntPipe) userId: number) {
    return this.resultsService.findByPatient(userId);
  }

  @Patch(':id/user/:userId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Update a result via userId' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateResultDto,
  ) {
    return this.resultsService.update(id, userId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Delete a result' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.resultsService.remove(id);
  }
}
