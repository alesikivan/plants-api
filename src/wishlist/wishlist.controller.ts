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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { I18nService } from 'nestjs-i18n';
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
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly i18n: I18nService,
  ) {}

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
    return this.wishlistService.create(createWishlistDto, file, req.user._id, req.user.name);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('genusId') genusId?: string,
    @Query('varietyId') varietyId?: string,
  ) {
    return this.wishlistService.findAll(req.user._id, search, genusId, varietyId);
  }

  @Patch('reorder')
  reorder(@Body() body: { ids: string[] }, @Request() req) {
    return this.wishlistService.reorder(body.ids, req.user._id);
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
    return this.wishlistService.update(id, updateWishlistDto, file, req.user._id, req.user.name);
  }

  @Public()
  @Get('photo/:filename')
  async getPhoto(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = `./uploads/wishlist/${filename}`;

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(
        await this.i18n.translate('wishlist.errors.photoNotFound')
      );
    }

    return res.sendFile(filename, { root: './uploads/wishlist' });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.wishlistService.remove(id, req.user._id);
  }
}
