import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue, Query } from 'firebase-admin/firestore';
import { rangoFechas } from '../caja/rango-fechas';
import { FirebaseService } from '../firebase/firebase.service';
import { Servicio } from '../servicios/entities/servicio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CreateAtencionDto } from './dto/create-atencion.dto';
import { Atencion, AtencionJson, serializeAtencion } from './entities/atencion.entity';

const VENTANA_ANULACION_MS = 3 * 60 * 1000;

@Injectable()
export class AtencionesService {
  constructor(private readonly firebase: FirebaseService) {}

  private get collection() {
    return this.firebase.firestore.collection('atenciones');
  }

  private lock(idUsuario: string) {
    return this.firebase.firestore.collection('_operaciones').doc('atenciones-' + idUsuario);
  }

  async list(desde: string, hasta: string, idUsuario?: string): Promise<AtencionJson[]> {
    const { inicio, limite } = rangoFechas(desde, hasta);
    let query: Query = this.collection
      .where('fecha_registro', '>=', inicio)
      .where('fecha_registro', '<', limite)
      .orderBy('fecha_registro', 'desc');
    if (idUsuario) query = query.where('id_usuario', '==', idUsuario);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => serializeAtencion({ ...(doc.data() as Atencion), id_atencion: doc.id }));
  }

  async create(idUsuario: string, dto: CreateAtencionDto): Promise<AtencionJson> {
    const ref = this.collection.doc();
    const userRef = this.firebase.firestore.collection('usuarios').doc(idUsuario);
    const serviceRef = this.firebase.firestore.collection('servicios').doc(dto.id_servicio);
    const lock = this.lock(idUsuario);

    await this.firebase.firestore.runTransaction(async (transaction) => {
      const [profileDoc, serviceDoc] = await transaction.getAll(userRef, serviceRef, lock);
      const user = profileDoc.data() as Usuario | undefined;
      if (user?.rol !== 'barbero') throw new ForbiddenException('Este perfil no puede registrar atenciones.');

      const service = serviceDoc.data() as Servicio | undefined;
      if (!service) throw new NotFoundException('El servicio ya no está en el catálogo.');

      const record: Omit<Atencion, 'fecha_registro'> = {
        id_atencion: ref.id,
        monto_total: service.precio,
        comision_generada: Math.round(service.precio * (user.porcentaje_comision ?? 50) / 100),
        metodo_pago: dto.metodo_pago,
        estado: 'activa',
        id_usuario: idUsuario,
        nombre_barbero: user.nombre,
        id_servicio: serviceDoc.id,
        nombre_servicio: service.nombre_servicio,
      };
      transaction.create(ref, { ...record, fecha_registro: FieldValue.serverTimestamp() });
      transaction.set(lock, { actualizado: FieldValue.serverTimestamp() });
    });

    return serializeAtencion((await ref.get()).data() as Atencion);
  }

  async undoLast(idUsuario: string, idAtencion: string): Promise<AtencionJson> {
    const lock = this.lock(idUsuario);
    const latest = this.collection.where('id_usuario', '==', idUsuario).orderBy('fecha_registro', 'desc').limit(1);

    return this.firebase.firestore.runTransaction(async (transaction) => {
      await transaction.get(lock);
      const snapshot = await transaction.get(latest);
      const doc = snapshot.docs[0];
      if (!doc || doc.id !== idAtencion) {
        throw new ConflictException('Solo puedes anular tu última atención.');
      }

      const record = doc.data() as Atencion;
      if (record.estado !== 'activa') throw new ConflictException('Esta atención ya fue anulada.');
      if (Date.now() - record.fecha_registro.toMillis() >= VENTANA_ANULACION_MS) {
        throw new ConflictException('La atención ya superó los 3 minutos para anular.');
      }

      transaction.update(doc.ref, { estado: 'anulada' });
      transaction.set(lock, { actualizado: FieldValue.serverTimestamp() });
      return serializeAtencion({ ...record, estado: 'anulada' });
    });
  }
}