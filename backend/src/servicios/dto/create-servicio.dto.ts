import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class CreateServicioDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 100)
  nombre_servicio!: string;

  @IsInt()
  @Min(1)
  @Max(100000000)
  precio!: number;
}