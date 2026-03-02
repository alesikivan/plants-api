import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GenusService } from './genus.service';
import { CreateGenusDto } from './dto/create-genus.dto';
import { UpdateGenusDto } from './dto/update-genus.dto';
import { ValidateGenusDto } from './dto/validate-genus.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('genus')
@UseGuards(JwtAuthGuard)
export class GenusController {
  constructor(private readonly genusService: GenusService) {}

  @Post()
  create(@Body() createGenusDto: CreateGenusDto) {
    return this.genusService.create(createGenusDto);
  }

  @Post('validate')
  validate(@Body() validateGenusDto: ValidateGenusDto) {
    return this.genusService.validate(validateGenusDto.query);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.genusService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.genusService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGenusDto: UpdateGenusDto) {
    return this.genusService.update(id, updateGenusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.genusService.remove(id);
  }
}
