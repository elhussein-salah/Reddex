import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';
import { normalizePhone } from '../src/common/utils/phone.util';

const databaseUrl = process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error('Missing required env var: DATABASE_URL');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function validateStrongSeedPassword(password: string): void {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (
    password.length < 12 ||
    !hasUppercase ||
    !hasLowercase ||
    !hasNumber ||
    !hasSpecial
  ) {
    throw new Error(
      'SEED_SUPER_ADMIN_PASSWORD must be at least 12 chars and include uppercase, lowercase, number, and symbol.',
    );
  }
}

async function seedSuperAdmin() {
  const name = requireEnv('SEED_SUPER_ADMIN_NAME');
  const email = requireEnv('SEED_SUPER_ADMIN_EMAIL').toLowerCase();
  const password = requireEnv('SEED_SUPER_ADMIN_PASSWORD');
  const phone = normalizePhone(requireEnv('SEED_SUPER_ADMIN_PHONE'));

  validateStrongSeedPassword(password);

  const hashedPassword = await argon2.hash(password);

  const superAdmin = await prisma.users.upsert({
    where: { email },
    create: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
      photourl: null,
      gender: 'MALE',
      SSN: '000000000',
      birthdate: new Date('1980-01-01'),
    },
    update: {
      name,
      phone,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
      gender: 'MALE',
      SSN: '000000000',
      birthdate: new Date('1980-01-01'),
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  console.log('Seeded super admin:', superAdmin);
}

async function main() {
  await seedSuperAdmin();
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
