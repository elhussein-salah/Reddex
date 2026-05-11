import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { UpdateDoctorDto } from './dto/update.doctor.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FilterDoctorDto } from './dto/filter.doctor.dto';

@ApiTags('Doctors')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get all doctors (paginated)' })
  findAll(@Query() filter: FilterDoctorDto) {
    return this.doctorService.findAll(filter);
  }
  @Get('pendings')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get pending doctor accounts awaiting approval (paginated)',
  })
  findPendings(@Query() pagination: PaginationDto) {
    return this.doctorService.findPendings(pagination);
  }
  @Get(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get doctor by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update doctor by ID (admin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDoctorDto) {
    return this.doctorService.updateDoctor(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete doctor by ID (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.deleteDoctor(id);
  }
}
