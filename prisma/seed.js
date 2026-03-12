const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const services = [
  { code: "A", name: "Customer Service" },
  { code: "B", name: "Teller" },
];

const counters = [{ name: "Loket 1" }, { name: "Loket 2" }];

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: { name: service.name },
      create: service,
    });
  }

  for (const counter of counters) {
    const existing = await prisma.counter.findFirst({
      where: { name: counter.name },
    });
    if (!existing) {
      await prisma.counter.create({ data: counter });
    }
  }

  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      nama: "Administrator",
      nipLama: "0000000001",
      password: adminHash,
      isAdmin: true,
    },
    create: {
      nama: "Administrator",
      nipLama: "0000000001",
      username: "admin",
      password: adminHash,
      isAdmin: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
