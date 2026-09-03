import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generarPasswordGenerica(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';
  const todos = mayusculas + minusculas + numeros + simbolos;

  const aleatorio = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const passwordArray = [
    aleatorio(mayusculas),
    aleatorio(minusculas),
    aleatorio(numeros),
    aleatorio(simbolos),
    ...Array.from({ length: 8 }, () => aleatorio(todos)),
  ];

  return passwordArray.sort(() => Math.random() - 0.5).join('');
}