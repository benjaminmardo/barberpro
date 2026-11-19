import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROL_USUARIOS, RolUsuario, Usuario } from '../usuarios/entities/usuario.entity';
import { FirebaseService } from './firebase.service';

interface AuthenticatedRequest extends Request {
  user: Usuario;
}

const ROLES_KEY = 'barberpro:roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): Usuario =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

function errorCode(error: unknown): string {
  return String((error as { code?: string | number } | null)?.code ?? '');
}

function serviceFailure(code: string, operation: 'authentication' | 'profile'): ServiceUnavailableException {
  if ([
    'app/invalid-credential', 'auth/invalid-credential', 'auth/insufficient-permission',
    'auth/project-not-found', '7', '16',
  ].includes(code)) {
    return new ServiceUnavailableException(
      'El servidor no tiene una credencial válida de Firebase Admin o no tiene permisos. Revisa GOOGLE_APPLICATION_CREDENTIALS y el proyecto del backend.',
    );
  }
  if (operation === 'profile' && ['5', 'not-found'].includes(code)) {
    return new ServiceUnavailableException(
      'La base de datos de Firestore no está disponible. Crea la base (default) en el proyecto de Firebase del backend.',
    );
  }
  if ([
    'auth/certificate-fetch-failed', 'app/network-error', 'app/network-timeout',
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', '4', '14',
  ].includes(code)) {
    return new ServiceUnavailableException(
      'El servidor no pudo conectar con Firebase. Revisa su conexión e inténtalo de nuevo.',
    );
  }
  return new ServiceUnavailableException(operation === 'authentication'
    ? 'El servidor no pudo validar la sesión con Firebase. Revisa la credencial de Firebase Admin y los registros del backend.'
    : 'El servidor no pudo consultar el perfil en Firestore. Revisa la credencial de Firebase Admin, los permisos y la base de datos.');
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? '')?.[1];
    if (!token) throw new UnauthorizedException('Inicia sesión para continuar.');

    let uid: string;
    try {
      const claims = await this.firebase.auth.verifyIdToken(token, true);
      uid = claims.uid;
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/user-disabled') {
        throw new ForbiddenException('Esta cuenta está deshabilitada.');
      }
      if ([
        'auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token',
        'auth/invalid-argument', 'auth/argument-error', 'auth/user-not-found',
      ].includes(code)) {
        throw new UnauthorizedException('La sesión no es válida o ha expirado. Vuelve a iniciar sesión.');
      }
      throw serviceFailure(code, 'authentication');
    }

    let profile: Usuario | undefined;
    try {
      const snapshot = await this.firebase.firestore.collection('usuarios').doc(uid).get();
      profile = snapshot.data() as Usuario | undefined;
    } catch (error) {
      throw serviceFailure(errorCode(error), 'profile');
    }
    if (!profile || !ROL_USUARIOS.includes(profile.rol)) {
      throw new ForbiddenException('Tu cuenta aún no tiene un perfil habilitado.');
    }

    const roles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(profile.rol)) {
      throw new ForbiddenException('Tu perfil no tiene acceso a esta operación.');
    }

    request.user = { ...profile, id_usuario: uid, porcentaje_comision: profile.porcentaje_comision ?? 50 };
    return true;
  }
}
