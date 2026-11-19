import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { DocumentIdPipe } from '../firebase/document-id.pipe';
import { Roles } from '../firebase/firebase-auth.guard';
import { CreateMetaDto } from './dto/create-meta.dto';
import { MetasService } from './metas.service';

@Controller('metas')
@Roles('administrador')
export class MetasController {
  constructor(private readonly metas: MetasService) {}

  @Get()
  @Roles('administrador', 'barbero')
  list() {
    return this.metas.list();
  }

  @Post()
  create(@Body() dto: CreateMetaDto) {
    return this.metas.save(dto);
  }

  @Patch(':id')
  update(@Param('id', DocumentIdPipe) id: string, @Body() dto: CreateMetaDto) {
    return this.metas.save(dto, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', DocumentIdPipe) id: string) {
    return this.metas.remove(id);
  }
}