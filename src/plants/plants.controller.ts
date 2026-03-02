import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PlantsService } from './plants.service';
import { PlantHistoryService } from './plant-history.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { CreatePlantHistoryDto } from './dto/create-plant-history.dto';
import { UpdatePlantHistoryDto } from './dto/update-plant-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('plants')
@UseGuards(JwtAuthGuard)
export class PlantsController {
  constructor(
    private readonly plantsService: PlantsService,
    private readonly plantHistoryService: PlantHistoryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/plants',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `plant-${uniqueSuffix}${ext}`);
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
    @Body() createPlantDto: CreatePlantDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.plantsService.create(createPlantDto, file, req.user._id);
  }

  @Get()
  findAll(@Request() req) {
    return this.plantsService.findAll(req.user._id);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminFindAll() {
    return this.plantsService.adminFindAll();
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminRemove(@Param('id') id: string) {
    return this.plantsService.adminRemove(id);
  }

  @Get('admin/history')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminFindAllHistory() {
    return this.plantHistoryService.adminFindAll();
  }

  @Delete('admin/history/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  adminRemoveHistory(@Param('id') id: string) {
    return this.plantHistoryService.adminRemove(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.plantsService.findOne(id, req.user._id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/plants',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `plant-${uniqueSuffix}${ext}`);
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
    @Body() updatePlantDto: UpdatePlantDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.plantsService.update(id, updatePlantDto, file, req.user._id);
  }

  @Public()
  @Get('photo/:filename')
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `./uploads/plants/${filename}`;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Photo not found');
    }

    return res.sendFile(filename, { root: './uploads/plants' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.plantsService.remove(id, req.user._id);
  }

  // Plant History endpoints
  @Post(':plantId/history')
  @UseInterceptors(FilesInterceptor('photos', 10, {
    storage: diskStorage({
      destination: './uploads/plant-history',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `history-${uniqueSuffix}${ext}`);
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
  createHistory(
    @Param('plantId') plantId: string,
    @Body() createPlantHistoryDto: CreatePlantHistoryDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.plantHistoryService.create(
      plantId,
      createPlantHistoryDto,
      files,
      req.user._id,
    );
  }

  @Get(':plantId/history')
  findAllHistory(@Param('plantId') plantId: string, @Request() req) {
    return this.plantHistoryService.findAllByPlant(plantId, req.user._id);
  }

  @Get(':plantId/history/:historyId')
  findOneHistory(
    @Param('plantId') plantId: string,
    @Param('historyId') historyId: string,
    @Request() req,
  ) {
    return this.plantHistoryService.findOne(plantId, historyId, req.user._id);
  }

  @Patch(':plantId/history/:historyId')
  @UseInterceptors(FilesInterceptor('photos', 10, {
    storage: diskStorage({
      destination: './uploads/plant-history',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `history-${uniqueSuffix}${ext}`);
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
  updateHistory(
    @Param('plantId') plantId: string,
    @Param('historyId') historyId: string,
    @Body() updatePlantHistoryDto: UpdatePlantHistoryDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.plantHistoryService.update(
      plantId,
      historyId,
      updatePlantHistoryDto,
      files,
      req.user._id,
    );
  }

  @Delete(':plantId/history/:historyId')
  removeHistory(
    @Param('plantId') plantId: string,
    @Param('historyId') historyId: string,
    @Request() req,
  ) {
    return this.plantHistoryService.remove(plantId, historyId, req.user._id);
  }

  @Public()
  @Get('history/photo/:filename')
  async getHistoryPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `./uploads/plant-history/${filename}`;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Photo not found');
    }

    return res.sendFile(filename, { root: './uploads/plant-history' });
  }
}
