import { BadRequestException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';

const TIME_ZONE = 'America/Santiago';
const MAX_DAYS = 366;

export function rangoFechas(desde: string, hasta: string) {
  const start = DateTime.fromISO(desde, { zone: TIME_ZONE }).startOf('day');
  const end = DateTime.fromISO(hasta, { zone: TIME_ZONE }).plus({ days: 1 }).startOf('day');
  if (!start.isValid || !end.isValid || hasta < desde) {
    throw new BadRequestException('Revisa el orden y la validez de las fechas.');
  }

  const firstDay = DateTime.fromISO(desde, { zone: 'UTC' });
  const lastDay = DateTime.fromISO(hasta, { zone: 'UTC' });
  if (lastDay.diff(firstDay, 'days').days >= MAX_DAYS) {
    throw new BadRequestException('El rango admite hasta 366 días.');
  }

  return {
    inicio: Timestamp.fromDate(start.toJSDate()),
    limite: Timestamp.fromDate(end.toJSDate()),
  };
}