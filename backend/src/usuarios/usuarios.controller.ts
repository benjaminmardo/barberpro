import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { DocumentIdPipe } from '../firebase/document-id.pipe';
import { CurrentUser, Roles } from '../firebase/firebase-auth.guard';
import { CreateUsuarioDto, UpdateNombreDto, UpdateUsuarioDto } from './dto/create-usuario.dto';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get('me')
  profile(@CurrentUser() user: Usuario) {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: Usuario, @Body() dto: UpdateNombreDto) {
    return this.usuarios.update(user.id_usuario, dto);
  }

  @Get()
  @Roles('administrador')
  list() {
    return this.usuarios.list();
  }

  @Post()
  @Roles('administrador')
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarios.create(dto);
  }

  @Post(':id/restablecer-clave')
  @Roles('administrador')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resetBarberPassword(@Param('id', DocumentIdPipe) id: string) {
    return this.usuarios.resetBarberPassword(id);
  }

  @Patch(':id')
  @Roles('administrador')
  update(@Param('id', DocumentIdPipe) id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuarios.update(id, dto);
  }
}
