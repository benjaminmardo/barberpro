import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { DocumentIdPipe } from '../firebase/document-id.pipe';
import { Roles } from '../firebase/firebase-auth.guard';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { ServiciosService } from './servicios.service';

@Controller('servicios')
@Roles('administrador')
export class ServiciosController {
  constructor(private readonly servicios: ServiciosService) {}

  @Get()
  @Roles('administrador', 'barbero')
  list() {
    return this.servicios.list();
  }

  @Post()
  create(@Body() dto: CreateServicioDto) {
    return this.servicios.create(dto);
  }

  @Post('seed')
  seed() {
    return this.servicios.seed();
  }

  @Patch(':id')
  update(@Param('id', DocumentIdPipe) id: string, @Body() dto: UpdateServicioDto) {
    return this.servicios.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', DocumentIdPipe) id: string) {
    return this.servicios.remove(id);
  }
}