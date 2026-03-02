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
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  FILE_UPLOAD_CONFIG,
  createImageUploadOptions,
} from '../config/file-upload.config';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'photo',
      createImageUploadOptions(
        FILE_UPLOAD_CONFIG.UPLOAD_DIRS.WISHLIST,
        FILE_UPLOAD_CONFIG.FILE_PREFIXES.WISHLIST,
      ),
    ),
  )
  create(
    @Body() createWishlistDto: CreateWishlistDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.wishlistService.create(createWishlistDto, file, req.user._id);
  }

  @Get()
  findAll(@Request() req) {
    return this.wishlistService.findAll(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.wishlistService.findOne(id, req.user._id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor(
      'photo',
      createImageUploadOptions(
        FILE_UPLOAD_CONFIG.UPLOAD_DIRS.WISHLIST,
        FILE_UPLOAD_CONFIG.FILE_PREFIXES.WISHLIST,
      ),
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateWishlistDto: UpdateWishlistDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.wishlistService.update(id, updateWishlistDto, file, req.user._id);
  }

  @Public()
  @Get('photo/:filename')
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `./uploads/wishlist/${filename}`;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Photo not found');
    }

    return res.sendFile(filename, { root: './uploads/wishlist' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.wishlistService.remove(id, req.user._id);
  }
}
