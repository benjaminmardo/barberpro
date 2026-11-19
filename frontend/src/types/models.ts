export type Rol = 'administrador' | 'barbero'
export type MetodoPago = 'efectivo' | 'tarjeta'
export type EstadoAtencion = 'activa' | 'anulada'

export interface Usuario {
  id_usuario: string
  nombre: string
  usuario?: string
  email: string
  rol: Rol
  porcentaje_comision: number
}

export type CreateUsuario = Pick<Usuario, 'nombre' | 'rol' | 'porcentaje_comision'> & {
  usuario: string
  password: string
}
export type UpdateUsuario = Pick<Usuario, 'nombre' | 'porcentaje_comision'>

export interface CredencialesAcceso {
  usuario: string
  password: string
}

export interface Servicio {
  id_servicio: string
  nombre_servicio: string
  precio: number
}

export type ServicioInput = Omit<Servicio, 'id_servicio'>

export interface Atencion {
  id_atencion: string
  fecha_registro: string
  monto_total: number
  comision_generada: number
  metodo_pago: MetodoPago
  estado: EstadoAtencion
  id_usuario: string
  nombre_barbero: string
  id_servicio: string
  nombre_servicio: string
}

export type AtencionInput = Pick<Atencion, 'id_servicio' | 'metodo_pago'>

export interface Meta {
  id_meta: string
  fecha_inicio: string
  fecha_fin: string
  cantidad_objetivo: number
  monto_bono: number
}

export type MetaInput = Omit<Meta, 'id_meta'>

export interface Caja {
  atenciones: Atencion[]
  barberos: Usuario[]
}
