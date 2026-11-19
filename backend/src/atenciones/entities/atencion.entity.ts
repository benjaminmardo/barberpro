import { Timestamp } from 'firebase-admin/firestore';

export const METODOS_PAGO = ['efectivo', 'tarjeta'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export interface Atencion {
  id_atencion: string;
  fecha_registro: Timestamp;
  monto_total: number;
  comision_generada: number;
  metodo_pago: MetodoPago;
  estado: 'activa' | 'anulada';
  id_usuario: string;
  nombre_barbero: string;
  id_servicio: string;
  nombre_servicio: string;
}

export type AtencionJson = Omit<Atencion, 'fecha_registro'> & { fecha_registro: string };

export function serializeAtencion(atencion: Atencion): AtencionJson {
  return { ...atencion, fecha_registro: atencion.fecha_registro.toDate().toISOString() };
}