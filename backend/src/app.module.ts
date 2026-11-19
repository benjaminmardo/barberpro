import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AtencionesModule } from './atenciones/atenciones.module';
import { CajaModule } from './caja/caja.module';
import { FirebaseModule } from './firebase/firebase.module';
import { MetasModule } from './metas/metas.module';
import { ServiciosModule } from './servicios/servicios.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    UsuariosModule,
    ServiciosModule,
    AtencionesModule,
    MetasModule,
    CajaModule,
  ],
})
export class AppModule {}