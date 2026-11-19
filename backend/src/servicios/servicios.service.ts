import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { Servicio } from './entities/servicio.entity';

const CATALOGO_INICIAL: readonly Servicio[] = [
  { id_servicio: 'corte-tradicional', nombre_servicio: 'Corte Tradicional', precio: 14000 },
  { id_servicio: 'degradado', nombre_servicio: 'Degradado', precio: 18000 },
  { id_servicio: 'arreglo-barba', nombre_servicio: 'Arreglo de Barba', precio: 9000 },
  { id_servicio: 'platinado-tinte', nombre_servicio: 'Platinado / Tinte', precio: 32000 },
  { id_servicio: 'alisado', nombre_servicio: 'Alisado', precio: 25000 },
  { id_servicio: 'rizado', nombre_servicio: 'Rizado', precio: 22000 },
];

@Injectable()
export class ServiciosService {
  constructor(private readonly firebase: FirebaseService) {}

  private get collection() {
    return this.firebase.firestore.collection('servicios');
  }

  async list(): Promise<Servicio[]> {
    const snapshot = await this.collection.orderBy('nombre_servicio').get();
    return snapshot.docs.map((doc) => ({ ...(doc.data() as Servicio), id_servicio: doc.id }));
  }

  async create(dto: CreateServicioDto): Promise<Servicio> {
    const ref = this.collection.doc();
    const service = { id_servicio: ref.id, ...dto };
    await ref.create(service);
    return service;
  }

  async update(id: string, dto: UpdateServicioDto): Promise<Servicio> {
    const ref = this.collection.doc(id);
    const service = { id_servicio: id, ...dto };
    return this.firebase.firestore.runTransaction(async (transaction) => {
      if (!(await transaction.get(ref)).exists) throw new NotFoundException('El servicio no existe.');
      transaction.set(ref, service);
      return service;
    });
  }

  async remove(id: string) {
    await this.collection.doc(id).delete();
  }

  async seed(): Promise<Servicio[]> {
    const refs = CATALOGO_INICIAL.map((service) => this.collection.doc(service.id_servicio));
    await this.firebase.firestore.runTransaction(async (transaction) => {
      const snapshots = await transaction.getAll(...refs);
      for (const [index, snapshot] of snapshots.entries()) {
        if (!snapshot.exists) transaction.create(snapshot.ref, CATALOGO_INICIAL[index]);
      }
    });
    return this.list();
  }
}