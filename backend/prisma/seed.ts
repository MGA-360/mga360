import { PrismaClient, CostType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Categorias fixas retiradas 1:1 da aba "Custos" da planilha original.
const COST_CATEGORIES: { name: string; costType: CostType }[] = [
  { name: "Alimentação/Ração", costType: CostType.VARIAVEL },
  { name: "Insumos", costType: CostType.VARIAVEL },
  { name: "Medicamentos", costType: CostType.VARIAVEL },
  { name: "Mão de obra", costType: CostType.FIXO },
  { name: "Energia", costType: CostType.FIXO },
  { name: "Manutenção", costType: CostType.FIXO },
  { name: "Outros Custos Operacionais", costType: CostType.VARIAVEL },
];

async function main() {
  for (const c of COST_CATEGORIES) {
    await prisma.costCategory.upsert({
      where: { name: c.name },
      update: { costType: c.costType },
      create: c,
    });
  }

  // Usuário admin padrão — TROQUE A SENHA no primeiro login em produção.
  const adminEmail = "admin@mga360.com.br";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("TrocarSenha!123", 10);
    await prisma.user.create({
      data: {
        name: "Administrador MGA 360",
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Admin criado: ${adminEmail} / TrocarSenha!123 (troque no primeiro login)`);
  }

  // Backfill: usuários criados antes da tabela company_memberships existir
  // (ex: clientes cadastrados pelo admin antes de hoje) ganham o vínculo
  // retroativamente, usando o companyId que já tinham. Idempotente — pode
  // rodar o seed quantas vezes quiser, não duplica.
  const usersWithCompanyNoMembership = await prisma.user.findMany({
    where: { companyId: { not: null } },
  });
  for (const u of usersWithCompanyNoMembership) {
    await prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: u.id, companyId: u.companyId! } },
      update: {},
      create: { userId: u.id, companyId: u.companyId! },
    });
  }
  if (usersWithCompanyNoMembership.length > 0) {
    console.log(`Vínculos (company_memberships) conferidos/criados para ${usersWithCompanyNoMembership.length} usuário(s).`);
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
