import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Length, Matches, Max, Min, ValidateIf } from 'class-validator';
import { ROL_USUARIOS, RolUsuario } from '../entities/usuario.entity';
import { normalizeUsername, USERNAME_PATTERN } from '../usuario-login';

export class UpdateNombreDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 100)
  nombre!: string;
}

export class CreateUsuarioDto extends UpdateNombreDto {
  @Transform(({ value }) => typeof value === 'string' ? normalizeUsername(value) : value)
  @Matches(USERNAME_PATTERN, {
    message: 'El usuario debe tener de 3 a 32 caracteres, comenzar con una letra o número y usar solo letras sin tilde, números, puntos, guiones o guiones bajos.',
  })
  usuario!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsIn(ROL_USUARIOS)
  rol!: RolUsuario;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  porcentaje_comision?: number;
}

export class UpdateUsuarioDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(2, 100)
  nombre?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  porcentaje_comision?: number;
}
