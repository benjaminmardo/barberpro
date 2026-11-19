import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { UserRecord } from 'firebase-admin/auth';
import { FirebaseService } from '../firebase/firebase.service';
import { generarClaveMemorable } from './clave-memorable';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto/create-usuario.dto';
import { ROL_USUARIOS, RolUsuario, Usuario } from './entities/usuario.entity';
import { emailForUsername, normalizeUsername, USERNAME_PATTERN } from './usuario-login';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(private readonly firebase: FirebaseService) {}

  async list(): Promise<Usuario[]> {
    const snapshot = await this.firebase.firestore.collection('usuarios').orderBy('nombre').get();
    return snapshot.docs.map((doc) => ({
      ...(doc.data() as Usuario),
      id_usuario: doc.id,
      porcentaje_comision: (doc.data() as Usuario).porcentaje_comision ?? 50,
    }));
  }

  async create(input: CreateUsuarioDto): Promise<Usuario> {
    const { nombre, usuario, password, rol, porcentaje_comision = 50 } = input;
    const email = emailForUsername(usuario);
    let uid: string;
    try {
      const account = await this.firebase.auth.createUser({ email, password, displayName: nombre });
      uid = account.uid;
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/email-already-exists') {
        throw new ConflictException('Ese nombre de usuario ya está en uso.');
      }
      throw error;
    }

    const user: Usuario = { id_usuario: uid, nombre, usuario, email, rol, porcentaje_comision };
    const ref = this.firebase.firestore.collection('usuarios').doc(uid);
    try {
      await ref.create(user);
    } catch (error) {
      try {
        const snapshot = await ref.get();
        if (snapshot.exists && snapshot.get('usuario') === usuario &&
            snapshot.get('email') === email && snapshot.get('rol') === rol) {
          return snapshot.data() as Usuario;
        }
        await this.firebase.auth.deleteUser(uid);
      } catch {
        this.logger.error('No se pudo completar la recuperación al crear un perfil: ' + uid);
      }
      throw error;
    }
    return user;
  }

  async isProvisioned(usuario: string, rol: RolUsuario): Promise<boolean> {
    const email = emailForUsername(usuario);
    try {
      const account = await this.firebase.auth.getUserByEmail(email);
      if (account.disabled) return false;
      const profile = await this.firebase.firestore.collection('usuarios').doc(account.uid).get();
      return profile.exists && profile.get('usuario') === usuario &&
        profile.get('rol') === rol && profile.get('email') === email;
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/user-not-found') return false;
      throw error;
    }
  }

  async resetBarberPassword(id: string) {
    const profile = await this.profileForPasswordReset(id);
    if (profile.rol !== 'barbero') {
      throw new ForbiddenException('Desde Equipo solo puedes restablecer la contraseña de un barbero.');
    }
    const account = await this.authAccount(this.firebase.auth.getUser(id));
    return this.replacePassword(account, profile);
  }

  async resetPasswordByUsername(identifier: string) {
    const usuario = normalizeUsername(identifier);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario);
    if (!isEmail && !USERNAME_PATTERN.test(usuario)) {
      throw new BadRequestException('Ingresa un nombre de usuario o correo válido.');
    }
    const email = isEmail ? usuario : emailForUsername(usuario);
    const account = await this.authAccount(this.firebase.auth.getUserByEmail(email));
    const profile = await this.profileForPasswordReset(account.uid);
    return this.replacePassword(account, profile);
  }

  private async profileForPasswordReset(id: string): Promise<Usuario> {
    const doc = await this.firebase.firestore.collection('usuarios').doc(id).get();
    const profile = doc.data() as Usuario | undefined;
    if (!profile || !ROL_USUARIOS.includes(profile.rol)) {
      throw new NotFoundException('La cuenta no tiene un perfil de Barber Pro.');
    }
    return profile;
  }

  private async replacePassword(account: UserRecord, profile: Usuario) {
    if (account.disabled) throw new ForbiddenException('La cuenta está deshabilitada.');
    if (!account.email) throw new ConflictException('La cuenta no tiene un identificador de acceso.');
    const usuario = profile.usuario && emailForUsername(profile.usuario) === account.email.toLowerCase()
      ? profile.usuario
      : account.email;
    const password = generarClaveMemorable();
    await this.authAccount(this.firebase.auth.updateUser(account.uid, { password }));
    return { usuario, password };
  }

  private async authAccount(result: Promise<UserRecord>): Promise<UserRecord> {
    try {
      return await result;
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/user-not-found') {
        throw new NotFoundException('La cuenta ya no existe en Firebase Authentication.');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUsuarioDto): Promise<Usuario> {
    const changes: UpdateUsuarioDto = {};
    if (input.nombre !== undefined) changes.nombre = input.nombre;
    if (input.porcentaje_comision !== undefined) changes.porcentaje_comision = input.porcentaje_comision;
    if (Object.keys(changes).length === 0) throw new BadRequestException('Indica algún dato para actualizar.');

    const ref = this.firebase.firestore.collection('usuarios').doc(id);
    return this.firebase.firestore.runTransaction(async (transaction) => {
      const profile = (await transaction.get(ref)).data() as Usuario | undefined;
      if (!profile) throw new NotFoundException('El perfil no existe.');
      transaction.update(ref, { ...changes });
      return {
        ...profile,
        id_usuario: id,
        porcentaje_comision: profile.porcentaje_comision ?? 50,
        ...changes,
      };
    });
  }
}
