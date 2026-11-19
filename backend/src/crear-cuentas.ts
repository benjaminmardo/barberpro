import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { generarClaveMemorable } from './usuarios/clave-memorable';
import { CreateUsuarioDto } from './usuarios/dto/create-usuario.dto';
import { UsuariosService } from './usuarios/usuarios.service';

const initialAccounts: Omit<CreateUsuarioDto, 'password'>[] = [
  { usuario: 'admin', nombre: 'Administrador GOAT STUDIO 777', rol: 'administrador' },
  { usuario: 'barbero01', nombre: 'Barbero 01', rol: 'barbero' },
  { usuario: 'barbero02', nombre: 'Barbero 02', rol: 'barbero' },
  { usuario: 'barbero03', nombre: 'Barbero 03', rol: 'barbero' },
];

async function createAccounts() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const users = app.get(UsuariosService);
    for (const account of initialAccounts) {
      const password = generarClaveMemorable();
      try {
        await users.create({ ...account, password });
        console.log(`Cuenta creada (${account.rol}): ${account.usuario} / ${password}`);
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
        if (!(await users.isProvisioned(account.usuario, account.rol))) {
          throw new Error(`El usuario ${account.usuario} está ocupado, deshabilitado o no tiene el perfil esperado. Revisa Authentication y el documento usuarios/{UID} en Firestore.`);
        }
        console.log(`Ya existe ${account.usuario} (${account.rol}). Conserva su contraseña actual.`);
      }
    }
  } finally {
    await app.close();
  }
}

void createAccounts().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : 'Error desconocido.';
  console.error('No se pudieron preparar todas las cuentas. ' + reason);
  process.exitCode = 1;
});
