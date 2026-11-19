export const usernamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function firebaseEmailForUsername(username: string): string {
  return normalizeUsername(username) + '@barberpro.example'
}

const passwordWords = [
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
]

function randomIndex(limit: number): number {
  const cutoff = Math.floor(2 ** 32 / limit) * limit
  const value = new Uint32Array(1)
  do {
    crypto.getRandomValues(value)
  } while (value[0] >= cutoff)
  return value[0] % limit
}

export function generateMemorablePassword(): string {
  const word = passwordWords[randomIndex(passwordWords.length)]
  const digits = String(randomIndex(10000)).padStart(4, '0')
  return word + digits + '!'
}
