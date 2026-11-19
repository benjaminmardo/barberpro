import { Module } from '@nestjs/common';
import { AtencionesModule } from '../atenciones/atenciones.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

@Module({
  imports: [AtencionesModule, UsuariosModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}