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
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { multerConfig } from 'src/common/config/multer.config';
import { imageFileFilter } from 'src/common/utils/file-filter.util';

@ApiTags('Labs')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new lab (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Cairo Central Lab' },
        workhours: { type: 'string', example: '08:00 - 20:00' },
        workdays: {
          type: 'array',
          items: { type: 'string' },
          example: ['Sunday', 'Monday', 'Tuesday'],
        },
        phone: { type: 'string', example: '+201234567890' },
        location: { type: 'string', example: '15 Ramses St, Cairo' },
        websiteUrl: { type: 'string', example: 'https://cairocentrallab.com' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreateLabDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.labsService.create(dto, file);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get all labs (paginated)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.labsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get a lab by ID' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.labsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a lab (admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Lab Name' },
        workhours: { type: 'string', example: '09:00 - 18:00' },
        workdays: {
          type: 'array',
          items: { type: 'string' },
          example: ['Monday', 'Wednesday', 'Friday'],
        },
        phone: { type: 'string', example: '+201234567890' },
        location: { type: 'string', example: '5 Nasr City, Cairo' },
        websiteUrl: { type: 'string', example: 'https://updatedlab.com' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLabDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.labsService.update(id, dto, file);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a lab (admin only)' })
  @ApiResponse({ status: 404, description: 'Lab not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.labsService.remove(id);
  }
}
