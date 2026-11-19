import { IsIn, Matches } from 'class-validator';
import { DOCUMENT_ID } from '../../firebase/document-id.pipe';
import { METODOS_PAGO, MetodoPago } from '../entities/atencion.entity';

export class CreateAtencionDto {
  @Matches(DOCUMENT_ID)
  id_servicio!: string;

  @IsIn(METODOS_PAGO)
  metodo_pago!: MetodoPago;
}