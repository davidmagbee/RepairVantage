/** Keep migrations and application traffic in the same PostgreSQL namespace. */
export function publicDatabaseUrl(value: string, setting: 'DATABASE_URL' | 'DIRECT_DATABASE_URL') {
  if (!/^postgres(?:ql)?:\/\//.test(value) || !URL.canParse(value)) {
    throw new Error(`${setting} must be a PostgreSQL connection URL`);
  }
  const url = new URL(value);
  // The pg adapter does not apply Prisma's legacy schema URL parameter.
  if (url.searchParams.getAll('schema').some(schema => schema !== 'public')) {
    throw new Error(`${setting} must use the public PostgreSQL schema`);
  }
  return value;
}
