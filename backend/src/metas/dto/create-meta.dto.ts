import { IsDateString, IsInt, Matches, Max, Min } from 'class-validator';
import { FECHA_LOCAL } from '../../caja/dto/cierre-caja-query.dto';

export class CreateMetaDto {
  @Matches(FECHA_LOCAL)
  @IsDateString({ strict: true })
  fecha_inicio!: string;

  @Matches(FECHA_LOCAL)
  @IsDateString({ strict: true })
  fecha_fin!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  cantidad_objetivo!: number;

  @IsInt()
  @Min(0)
  @Max(100000000)
  monto_bono!: number;
}