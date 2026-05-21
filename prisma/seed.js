const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const services = [
  { code: "A", name: "Umum", color: "#f59e0b" },
  { code: "B", name: "Permintaan Data", color: "#2563eb" },
  { code: "C", name: "Pelayanan Publik", color: "#25eb71" },
];

const counters = [{ name: "Loket Pelayanan Publik" }, { name: "Loket Permintaan Data" }];
const shiftSettings = [
  { shift: "PAGI", startTime: "00:00", endTime: "11:59" },
  { shift: "SIANG", startTime: "12:00", endTime: "23:59" },
];

async function main() {
  for (const service of services) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: { name: service.name, color: service.color },
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

  for (const setting of shiftSettings) {
    await prisma.shiftSetting.upsert({
      where: { shift: setting.shift },
      update: {},
      create: setting,
    });
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
