const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const username = process.env.SUPER_ADMIN_USERNAME?.trim();
if (!username) {
  console.error("Migration dihentikan: SUPER_ADMIN_USERNAME wajib diisi dan menunjuk satu akun admin lama.");
  process.exit(1);
}
const migrationsDir = join(__dirname, "..", "prisma", "migrations");
for (const file of [
  join(migrationsDir, "20261118000000_baseline", "migration.sql"),
  join(migrationsDir, "20261118000100_admin_levels", "migration.sql"),
]) {
  if (!existsSync(file)) {
    console.error(`Migration SQL tidak ditemukan: ${file}`);
    process.exit(1);
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Migration dihentikan: DATABASE_URL wajib diisi.");
  process.exit(1);
}
const databaseUrl = new URL(url);
const decode = (value) => decodeURIComponent(value || "");
const mysqlArgs = [
  "--host", databaseUrl.hostname,
  "--port", databaseUrl.port || "3306",
  "--user", decode(databaseUrl.username),
  "--batch", "--skip-column-names",
  decode(databaseUrl.pathname.replace(/^\//, "")),
];
const quote = (value) => `'${value.replace(/'/g, "''")}'`;
const mysql = (sql) => execFileSync("mysql", mysqlArgs, {
  input: sql,
  encoding: "utf8",
  env: { ...process.env, MYSQL_PWD: decode(databaseUrl.password) },
}).trim();

try {
  const migrationTable = Number(mysql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations';"));
  if (migrationTable === 0) {
    const applicationTables = Number(mysql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations';"));
    if (applicationTables === 0) {
      execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
      execFileSync("npx", ["prisma", "generate"], { stdio: "inherit", shell: process.platform === "win32" });
      execFileSync("npx", ["prisma", "db", "seed"], { stdio: "inherit", shell: process.platform === "win32" });
      const initialized = Number(mysql("SELECT COUNT(*) FROM `User` WHERE `username` = " + quote(username) + " AND `adminLevel` = 'SUPER_ADMIN';"));
      if (initialized !== 1) throw new Error("Initial SUPER_ADMIN seed did not create the configured account.");
      console.log(`Empty database initialized with ${username} as SUPER_ADMIN.`);
      process.exit(0);
    }
    const legacyTarget = Number(mysql("SELECT COUNT(*) FROM `User` WHERE `username` = " + quote(username) + " AND `isAdmin` = 1;"));
    if (legacyTarget !== 1) {
      console.error(`Migration dihentikan: SUPER_ADMIN_USERNAME=\"${username}\" harus menunjuk tepat satu akun lama isAdmin=true.`);
      process.exit(1);
    }
    if (applicationTables > 0) {
      console.error("Database existing belum memiliki _prisma_migrations. Untuk DB dari db push: backup dan review schema lengkap, tandai 20261118000000_baseline sebagai applied dengan `npx prisma migrate resolve --applied 20261118000000_baseline`, lalu jalankan script ini lagi. Runner menolak menerapkan baseline pada DB berisi tabel.");
      process.exit(1);
    }
    execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
  } else {
    const baselineApplied = Number(mysql("SELECT COUNT(*) FROM `_prisma_migrations` WHERE `migration_name` = '20261118000000_baseline' AND `finished_at` IS NOT NULL;"));
    if (baselineApplied !== 1) {
      console.error("Baseline 20261118000000_baseline belum tercatat applied. Review DB, lalu jalankan prisma migrate resolve sebelum runner.");
      process.exit(1);
    }
    const levelMigrationApplied = Number(mysql("SELECT COUNT(*) FROM `_prisma_migrations` WHERE `migration_name` = '20261118000100_admin_levels' AND `finished_at` IS NOT NULL;"));
    if (levelMigrationApplied === 0) {
      const legacyTarget = Number(mysql(`SELECT COUNT(*) FROM \`User\` WHERE \`username\` = ${quote(username)} AND \`isAdmin\` = 1;`));
      if (legacyTarget !== 1) {
        console.error(`Migration dihentikan: SUPER_ADMIN_USERNAME="${username}" harus cocok dengan tepat satu akun lama isAdmin=true.`);
        process.exit(1);
      }
      execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
    }
  }
  const superAdminCount = Number(mysql("SELECT COUNT(*) FROM `User` WHERE `adminLevel` = 'SUPER_ADMIN';"));
  if (superAdminCount !== 0) {
    console.error("Schema telah dimigrasikan, tetapi database sudah memiliki SUPER_ADMIN; promosi otomatis dibatalkan.");
    process.exit(1);
  }
  const updated = Number(mysql(`UPDATE \`User\` SET \`adminLevel\` = 'SUPER_ADMIN' WHERE \`username\` = ${quote(username)} AND \`adminLevel\` = 'ADMIN_OPERASIONAL'; SELECT ROW_COUNT();`).split(/\r?\n/).at(-1));
  if (updated !== 1) {
    console.error("Schema telah dimigrasikan tetapi promosi target gagal. Jangan buka aplikasi sebelum penetapan Super Admin ditangani.");
    process.exit(1);
  }
  console.log(`Migration selesai; ${username} ditetapkan sebagai SUPER_ADMIN.`);
} catch (error) {
  console.error("Migration gagal:", error.message);
  process.exit(1);
}

