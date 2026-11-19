import { Injectable } from '@nestjs/common';
import { AtencionesService } from '../atenciones/atenciones.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CierreCajaQueryDto } from './dto/cierre-caja-query.dto';

@Injectable()
export class CajaService {
  constructor(
    private readonly atenciones: AtencionesService,
    private readonly usuarios: UsuariosService,
  ) {}

  async cierre(query: CierreCajaQueryDto) {
    const [atenciones, usuarios] = await Promise.all([
      this.atenciones.list(query.desde, query.hasta),
      this.usuarios.list(),
    ]);
    const barberos = usuarios.filter((user) => user.rol === 'barbero');
    const totals = { recaudado: 0, efectivo: 0, tarjeta: 0, atenciones: 0, comisiones: 0 };
    const rendimiento = new Map(barberos.map((barbero) => [barbero.id_usuario, {
      id_usuario: barbero.id_usuario,
      nombre: barbero.nombre,
      atenciones: 0,
      recaudado: 0,
      comisiones: 0,
    }]));

    for (const record of atenciones) {
      if (record.estado !== 'activa') continue;
      totals.recaudado += record.monto_total;
      totals[record.metodo_pago] += record.monto_total;
      totals.atenciones++;
      totals.comisiones += record.comision_generada;

      const member = rendimiento.get(record.id_usuario) ?? {
        id_usuario: record.id_usuario,
        nombre: record.nombre_barbero,
        atenciones: 0,
        recaudado: 0,
        comisiones: 0,
      };
      member.atenciones++;
      member.recaudado += record.monto_total;
      member.comisiones += record.comision_generada;
      rendimiento.set(record.id_usuario, member);
    }

    return {
      atenciones,
      barberos,
      totales: totals,
      rendimiento: [...rendimiento.values()].sort((a, b) => b.atenciones - a.atenciones || b.recaudado - a.recaudado),
    };
  }
}