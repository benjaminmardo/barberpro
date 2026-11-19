import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CierreCajaQueryDto } from '../caja/dto/cierre-caja-query.dto';
import { DocumentIdPipe } from '../firebase/document-id.pipe';
import { CurrentUser, Roles } from '../firebase/firebase-auth.guard';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AtencionesService } from './atenciones.service';
import { CreateAtencionDto } from './dto/create-atencion.dto';

@Controller('atenciones')
@Roles('barbero')
export class AtencionesController {
  constructor(private readonly atenciones: AtencionesService) {}

  @Get()
  list(@CurrentUser() user: Usuario, @Query() query: CierreCajaQueryDto) {
    return this.atenciones.list(query.desde, query.hasta, user.id_usuario);
  }

  @Post()
  create(@CurrentUser() user: Usuario, @Body() dto: CreateAtencionDto) {
    return this.atenciones.create(user.id_usuario, dto);
  }

  @Patch(':id/anular')
  undo(@CurrentUser() user: Usuario, @Param('id', DocumentIdPipe) id: string) {
    return this.atenciones.undoLast(user.id_usuario, id);
  }
}