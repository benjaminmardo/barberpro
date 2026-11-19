import { IsDateString, Matches } from 'class-validator';

export const FECHA_LOCAL = /^\d{4}-\d{2}-\d{2}$/;
const MESSAGE = 'Usa fechas con formato AAAA-MM-DD.';

export class CierreCajaQueryDto {
  @Matches(FECHA_LOCAL, { message: MESSAGE })
  @IsDateString({ strict: true }, { message: 'La fecha desde no es válida.' })
  desde!: string;

  @Matches(FECHA_LOCAL, { message: MESSAGE })
  @IsDateString({ strict: true }, { message: 'La fecha hasta no es válida.' })
  hasta!: string;
}