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
import { VarietyService } from './variety.service';
import { CreateVarietyDto } from './dto/create-variety.dto';
import { UpdateVarietyDto } from './dto/update-variety.dto';
import { ValidateVarietyDto } from './dto/validate-variety.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('variety')
@UseGuards(JwtAuthGuard)
export class VarietyController {
  constructor(private readonly varietyService: VarietyService) {}

  @Post()
  create(@Body() createVarietyDto: CreateVarietyDto) {
    return this.varietyService.create(createVarietyDto);
  }

  @Post('validate')
  validate(@Body() validateVarietyDto: ValidateVarietyDto, @CurrentUser() user: UserDocument) {
    return this.varietyService.validate(validateVarietyDto.query, validateVarietyDto.genusId, user);
  }

  @Get()
  findAll(
    @Query('genusId') genusId?: string,
    @Query('search') search?: string,
  ) {
    if (genusId) {
      return this.varietyService.findByGenus(genusId, search);
    }
    return this.varietyService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.varietyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVarietyDto: UpdateVarietyDto) {
    return this.varietyService.update(id, updateVarietyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.varietyService.remove(id);
  }
}
