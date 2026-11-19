import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../firebase/firebase-auth.guard';
import { CajaService } from './caja.service';
import { CierreCajaQueryDto } from './dto/cierre-caja-query.dto';

@Controller('caja')
@Roles('administrador')
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Get()
  cierre(@Query() query: CierreCajaQueryDto) {
    return this.caja.cierre(query);
  }
}