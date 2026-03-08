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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Public } from '../auth/decorators/public.decorator';
import {
  FILE_UPLOAD_CONFIG,
  createImageUploadOptions,
} from '../config/file-upload.config';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('shelves')
@UseGuards(JwtAuthGuard)
export class ShelvesController {
  constructor(private readonly shelvesService: ShelvesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'photo',
      createImageUploadOptions(
        FILE_UPLOAD_CONFIG.UPLOAD_DIRS.SHELVES,
        FILE_UPLOAD_CONFIG.FILE_PREFIXES.SHELVES,
      ),
    ),
  )
  create(
    @Body() createShelfDto: CreateShelfDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.shelvesService.create(createShelfDto, file, req.user._id, req.user.name);
  }

  @Get()
  findAll(@Request() req, @Query('search') search?: string) {
    return this.shelvesService.findAll(req.user._id, search);
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
  @UseInterceptors(
    FileInterceptor(
      'photo',
      createImageUploadOptions(
        FILE_UPLOAD_CONFIG.UPLOAD_DIRS.SHELVES,
        FILE_UPLOAD_CONFIG.FILE_PREFIXES.SHELVES,
      ),
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateShelfDto: UpdateShelfDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.shelvesService.update(id, updateShelfDto, file, req.user._id, req.user.name);
  }

  @Public()
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
