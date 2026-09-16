import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const staffNo = "ADMIN01";
  const existing = await prisma.user.findUnique({ where: { staffNo } });
  if (existing) {
    console.log(`Bootstrap admin ${staffNo} already exists — skipping.`);
    return;
  }

  const password = await bcrypt.hash("Welcome@1", 10);

  await prisma.user.create({
    data: {
      staffNo,
      password,
      staffName: "SYSTEM ADMINISTRATOR",
      gender: "MALE",
      designation: "EXECUTIVE",
      status: "ACTIVE",
      roleType: "ADMIN",
      isHod: false,
    },
  });

  console.log(`Created bootstrap admin user: staffNo=${staffNo}, password=Welcome@1`);
  console.log("Sign in and create your real staff records, then change this password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
