import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadFolder } from 'src/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ApiResponse } from 'src/common/interfaces/api.response';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';

const LAB_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  workhours: true,
  workdays: true,
  phone: true,
  location: true,
  websiteUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class LabsService {
  private readonly logger = new Logger(LabsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateLabDto, file?: Express.Multer.File) {
    this.logger.log(`Creating lab: ${dto.name}`);

    const existing = await this.prisma.labs.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A lab with this name already exists');
    }

    let uploadedImage: { publicId: string; url: string } | null = null;
    if (file) {
      try {
        uploadedImage = await this.cloudinary.uploadImage(
          file,
          UploadFolder.LAB_PROFILE,
        );
      } catch (uploadErr: unknown) {
        const err =
          uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr));
        this.logger.warn(
          `Lab image upload failed for "${dto.name}", proceeding without image: ${err.message}`,
        );
      }
    }

    return this.prisma.labs.create({
      data: {
        name: dto.name,
        imageUrl: uploadedImage?.url ?? null,
        workhours: dto.workhours ?? null,
        workdays: dto.workdays ?? [],
        phone: dto.phone ?? null,
        location: dto.location ?? null,
        websiteUrl: dto.websiteUrl ?? null,
      },
      select: LAB_SELECT,
    });
  }

  async findAll() {
    const data = await this.prisma.labs.findMany({
      select: LAB_SELECT,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
    };
  }

  async findOne(id: number) {
    const lab = await this.prisma.labs.findUnique({
      where: { id },
      select: LAB_SELECT,
    });
    if (!lab) {
      throw new NotFoundException(`Lab with ID ${id} not found`);
    }
    return lab;
  }

  async update(id: number, dto: UpdateLabDto, file?: Express.Multer.File) {
    const lab = await this.prisma.labs.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!lab) {
      throw new NotFoundException(`Lab with ID ${id} not found`);
    }

    let newImageUrl: string | undefined;

    if (file) {
      // Delete old image from Cloudinary if it exists
      if (lab.imageUrl) {
        const publicId = this.cloudinary.extractPublicId(lab.imageUrl);
        if (publicId) {
          await this.cloudinary.deleteFile(publicId).catch(() => {});
        }
      }

      try {
        const uploaded = await this.cloudinary.uploadImage(
          file,
          UploadFolder.LAB_PROFILE,
        );
        newImageUrl = uploaded.url;
      } catch (uploadErr: unknown) {
        const err =
          uploadErr instanceof Error ? uploadErr : new Error(String(uploadErr));
        this.logger.warn(
          `Lab image update failed for ID ${id}: ${err.message}`,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.workhours !== undefined) data.workhours = dto.workhours;
    if (dto.workdays !== undefined) data.workdays = dto.workdays;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl;
    if (newImageUrl !== undefined) data.imageUrl = newImageUrl;

    return this.prisma.labs.update({
      where: { id },
      data,
      select: LAB_SELECT,
    });
  }

  async remove(id: number): Promise<ApiResponse> {
    const lab = await this.prisma.labs.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (!lab) {
      throw new NotFoundException(`Lab with ID ${id} not found`);
    }

    await this.prisma.labs.delete({ where: { id } });

    this.logger.log(`Lab deleted – id: ${id}`);

    // Best-effort Cloudinary cleanup
    if (lab.imageUrl) {
      const publicId = this.cloudinary.extractPublicId(lab.imageUrl);
      if (publicId) {
        this.cloudinary.deleteFile(publicId).catch(() => {});
      }
    }

    return { message: 'Lab deleted successfully', statusCode: 200 };
  }
}
