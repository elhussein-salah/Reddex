import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
} from '@nestjs/swagger';
import { imageFileFilter } from '../common/utils/file-filter.util';
import { multerConfig } from '../common/config/multer.config';
import { Role } from 'src/enums';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/role.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UploadFolder } from 'src/enums';
import type { AuthenticatedRequest } from 'src/common/interfaces/AuthenticatedRequest';

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
    return this.userService.create(
      dto,
      Role.PATIENT,
      UploadFolder.PATIENT_PROFILE,
      file,
    );
  }

  // ================= READ =================
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile from JWT' })
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
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by email' })
  findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  // ================= UPDATE =================
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // ================= DELETE =================
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
