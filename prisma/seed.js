const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding clean HCA Central Command database...");

  // Delete operational data first.
  // For trader testing, do not seed demo securities, positions, trades,
  // tax lots, comments, flags, watchlist entries, or market data.
  await prisma.auditLog.deleteMany();
  await prisma.ingestionRun.deleteMany();
  await prisma.marketDataCache.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.watchlistEntry.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.taxLot.deleteMany();
  await prisma.position.deleteMany();
  await prisma.security.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      email: "trader1@example.com",
      name: "Joseph Moore",
      passwordHash,
      role: "TRADER",
    },
  });

  await prisma.user.create({
    data: {
      email: "trader2@example.com",
      name: "Trader 2",
      passwordHash,
      role: "TRADER",
    },
  });

  await prisma.user.create({
    data: {
      email: "pm@example.com",
      name: "PM User",
      passwordHash,
      role: "PM",
    },
  });

  await prisma.user.create({
    data: {
      email: "compliance@example.com",
      name: "Compliance User",
      passwordHash,
      role: "COMPLIANCE",
    },
  });

  await prisma.user.create({
    data: {
      email: "viewer@example.com",
      name: "Viewer User",
      passwordHash,
      role: "VIEWER",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_COMPLETED",
      entityType: "SYSTEM",
      entityId: "clean-seed",
      newValueJson: JSON.stringify({
        users: 6,
        securities: 0,
        positions: 0,
        trades: 0,
        taxLots: 0,
        watchlistEntries: 0,
        comments: 0,
        flags: 0,
        marketDataCacheRows: 0,
      }),
    },
  });

  console.log("Clean seed complete.");
  console.log("");
  console.log("Login users:");
  console.log("admin@example.com / password123");
  console.log("trader1@example.com / password123");
  console.log("trader2@example.com / password123");
  console.log("pm@example.com / password123");
  console.log("compliance@example.com / password123");
  console.log("viewer@example.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
