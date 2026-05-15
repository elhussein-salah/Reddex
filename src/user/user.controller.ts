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
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { imageFileFilter } from '../common/utils/file-filter.util';
import { multerConfig } from '../common/config/multer.config';
import { Role } from 'src/enums';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UploadFolder } from 'src/enums';
import type { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ================= CREATE =================
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user with optional profile picture' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'StrongPass123' },
        role: { type: 'string', example: 'PATIENT' },
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      ...multerConfig,
      fileFilter: imageFileFilter,
    }),
  )
  create(
    @Body() dto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const role = dto.role ?? Role.PATIENT;
    const folder =
      role === Role.DOCTOR
        ? UploadFolder.DOCTOR_PROFILE
        : role === Role.ADMIN || role === Role.SUPER_ADMIN
          ? UploadFolder.ADMIN_PROFILE
          : UploadFolder.PATIENT_PROFILE;
    return this.userService.create(dto, role, folder, file);
  }

  // ================= READ =================
  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  findAll(@Query() pagination: PaginationDto) {
    return this.userService.findAll(pagination);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile from JWT' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getProfile(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('not authenticated');
    }
    return this.userService.getProfile({
      sub: req.user.sub,
      role: req.user.role,
    });
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get user by ID' })
  // findById(@Param('id', ParseIntPipe) id: number) {
  //   return this.userService.findById(id);
  // }

  @Get('email/:email')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Get user by email' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'User not found' })
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  // ================= UPDATE =================
  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // ================= DELETE =================
  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
