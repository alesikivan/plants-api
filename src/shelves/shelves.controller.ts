import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('shelves')
@UseGuards(JwtAuthGuard)
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/shelves',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `shelf-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  create(
    @Body() createShelfDto: CreateShelfDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.shelvesService.create(createShelfDto, file, req.user._id);
  }

  @Get()
  findAll(@Request() req) {
    return this.shelvesService.findAll(req.user._id);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminFindAll() {
    return this.shelvesService.adminFindAll();
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminRemove(@Param('id') id: string) {
    return this.shelvesService.adminRemove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.shelvesService.findOne(id, req.user._id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/shelves',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `shelf-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  update(
    @Param('id') id: string,
    @Body() updateShelfDto: UpdateShelfDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.shelvesService.update(id, updateShelfDto, file, req.user._id);
  }

  @Get('photo/:filename')
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `./uploads/shelves/${filename}`;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Photo not found');
    }

    return res.sendFile(filename, { root: './uploads/shelves' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.shelvesService.remove(id, req.user._id);
  }

  @Post(':shelfId/plants/:plantId')
  addPlantToShelf(
    @Param('shelfId') shelfId: string,
    @Param('plantId') plantId: string,
    @Request() req,
  ) {
    return this.shelvesService.addPlantToShelf(shelfId, plantId, req.user._id);
  }

  @Delete(':shelfId/plants/:plantId')
  removePlantFromShelf(
    @Param('shelfId') shelfId: string,
    @Param('plantId') plantId: string,
    @Request() req,
  ) {
    return this.shelvesService.removePlantFromShelf(shelfId, plantId, req.user._id);
  }

  @Put(':shelfId/plants')
  updateShelfPlants(
    @Param('shelfId') shelfId: string,
    @Body() body: { plantIds: string[] },
    @Request() req,
  ) {
    return this.shelvesService.updateShelfPlants(shelfId, body.plantIds, req.user._id);
  }
}
