import { randomInt } from 'node:crypto';

const palabras = [
  'Abeto', 'Acorde', 'Acero', 'Alamo', 'Alfil', 'Amigo', 'Anillo', 'Arena',
  'Aroma', 'Arroz', 'Astro', 'Avena', 'Avion', 'Azucar', 'Balsa', 'Barba',
  'Barco', 'Barro', 'Blanco', 'Bolsa', 'Bosque', 'Brisa', 'Brote', 'Cable',
  'Cacao', 'Calma', 'Campo', 'Canal', 'Canto', 'Carta', 'Cebra', 'Cedro',
  'Cerro', 'Cielo', 'Circo', 'Claro', 'Cobre', 'Cometa', 'Coral', 'Corte',
  'Costa', 'Crema', 'Cuero', 'Danza', 'Delfin', 'Dulce', 'Erizo', 'Fauna',
  'Feria', 'Fuego', 'Funda', 'Gafas', 'Gallo', 'Ganso', 'Globo', 'Grano',
  'Grillo', 'Guinda', 'Horno', 'Huerto', 'Jarra', 'Jaula', 'Joven', 'Junco',
  'Laurel', 'Leche', 'Leona', 'Libro', 'Llave', 'Lluvia', 'Mango', 'Marea',
  'Menta', 'Mirlo', 'Monte', 'Motor', 'Nieve', 'Norte', 'Oasis', 'Oliva',
  'Ostra', 'Palma', 'Panda', 'Pasto', 'Perla', 'Piano', 'Piedra', 'Plata',
  'Playa', 'Pluma', 'Poema', 'Prado', 'Queso', 'Radio', 'Reloj', 'Rubio',
  'Salsa', 'Selva', 'Silla', 'Sobre', 'Telar', 'Tierra', 'Tigre', 'Trigo',
  'Trono', 'Verde', 'Viento', 'Villa', 'Vuelo',
];

export function generarClaveMemorable(): string {
  const palabra = palabras[randomInt(palabras.length)];
  const numeros = randomInt(10_000).toString().padStart(4, '0');
  return palabra + numeros + '!';
}
