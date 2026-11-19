import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { rangoFechas } from '../caja/rango-fechas';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateMetaDto } from './dto/create-meta.dto';
import { Meta } from './entities/meta.entity';

@Injectable()
export class MetasService {
  constructor(private readonly firebase: FirebaseService) {}

  private get collection() {
    return this.firebase.firestore.collection('metas');
  }

  private get lock() {
    return this.firebase.firestore.collection('_operaciones').doc('metas');
  }

  async list(): Promise<Meta[]> {
    const snapshot = await this.collection.orderBy('fecha_inicio', 'desc').get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Meta), id_meta: doc.id }));
  }

  save(dto: CreateMetaDto, id?: string): Promise<Meta> {
    rangoFechas(dto.fecha_inicio, dto.fecha_fin);
    const ref = id ? this.collection.doc(id) : this.collection.doc();
    const goal: Meta = { ...dto, id_meta: ref.id };
    const lock = this.lock;
    return this.firebase.firestore.runTransaction(async (transaction) => {
      await transaction.get(lock);
      if (id && !(await transaction.get(ref)).exists) throw new NotFoundException('La meta no existe.');

      const previous = await transaction.get(this.collection.where('fecha_inicio', '<=', dto.fecha_fin));
      const overlaps = previous.docs.some((doc) => doc.id !== ref.id && doc.get('fecha_fin') >= dto.fecha_inicio);
      if (overlaps) throw new ConflictException('Ya hay una meta que coincide con esas fechas.');

      transaction.set(ref, goal);
      transaction.set(lock, { actualizado: FieldValue.serverTimestamp() });
      return goal;
    });
  }

  async remove(id: string) {
    const lock = this.lock;
    await this.firebase.firestore.runTransaction(async (transaction) => {
      await transaction.get(lock);
      transaction.delete(this.collection.doc(id));
      transaction.set(lock, { actualizado: FieldValue.serverTimestamp() });
    });
  }
}