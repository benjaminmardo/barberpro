import { BadRequestException, PipeTransform } from '@nestjs/common';

export const DOCUMENT_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export class DocumentIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!DOCUMENT_ID.test(value)) throw new BadRequestException('Identificador inválido.');
    return value;
  }
}