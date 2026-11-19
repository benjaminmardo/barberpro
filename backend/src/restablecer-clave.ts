import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsuariosService } from './usuarios/usuarios.service';

async function restablecerClave() {
  const [identifier, ...extraArgs] = process.argv.slice(2);
  if (!identifier || extraArgs.length) {
    throw new Error('Uso: npm --prefix backend run restablecer-clave -- <usuario-o-correo>');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const { usuario, password } = await app.get(UsuariosService).resetPasswordByUsername(identifier);
    console.log(`Usuario: ${usuario}\nNueva contraseña: ${password}`);
  } finally {
    await app.close();
  }
}

void restablecerClave().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : 'Error desconocido.';
  console.error('No se pudo restablecer la contraseña. ' + reason);
  process.exitCode = 1;
});
