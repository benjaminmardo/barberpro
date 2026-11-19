export const ROL_USUARIOS = ['administrador', 'barbero'] as const;
export type RolUsuario = (typeof ROL_USUARIOS)[number];

export interface Usuario {
  id_usuario: string;
  nombre: string;
  usuario?: string;
  email: string;
  rol: RolUsuario;
  porcentaje_comision: number;
}
