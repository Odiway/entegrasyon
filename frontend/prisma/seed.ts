import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@temsa.com' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: 'admin@temsa.com',
        fullName: 'Admin',
        hashedPassword: bcrypt.hashSync('admin1234', 10),
        role: 'admin',
      },
    });
    console.log('Admin user created: admin@temsa.com / admin1234');
  }

  // Create sample designer
  const designerExists = await prisma.user.findUnique({ where: { email: 'designer@temsa.com' } });
  if (!designerExists) {
    await prisma.user.create({
      data: {
        email: 'designer@temsa.com',
        fullName: 'Tasarımcı Test',
        hashedPassword: bcrypt.hashSync('test1234', 10),
        role: 'designer',
        uzmanlik: 'GÖVDE',
      },
    });
    console.log('Designer user created: designer@temsa.com / test1234 (GÖVDE)');
  }

  // Create sample engineer
  const engineerExists = await prisma.user.findUnique({ where: { email: 'engineer@temsa.com' } });
  if (!engineerExists) {
    await prisma.user.create({
      data: {
        email: 'engineer@temsa.com',
        fullName: 'Mühendis Test',
        hashedPassword: bcrypt.hashSync('test1234', 10),
        role: 'integration_engineer',
      },
    });
    console.log('Engineer user created: engineer@temsa.com / test1234');
  }

  console.log('Seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
