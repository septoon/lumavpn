import { PrismaClient } from '@prisma/client';
import { defaultPlans } from '@lumavpn/shared';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const activeCodes = defaultPlans.map((plan) => plan.code);

  for (const plan of defaultPlans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan
    });
  }

  await prisma.plan.updateMany({
    where: { code: { notIn: activeCodes } },
    data: { isActive: false }
  });

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    await prisma.log.create({
      data: {
        type: 'ADMIN',
        payload: {
          message: 'Admin credentials configured through environment',
          email,
          passwordHashPreview: (await bcrypt.hash(password, 10)).slice(0, 16)
        }
      }
    });
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
