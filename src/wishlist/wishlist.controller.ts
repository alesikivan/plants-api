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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/wishlist',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `wishlist-${uniqueSuffix}${ext}`);
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
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/wishlist',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `wishlist-${uniqueSuffix}${ext}`);
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
