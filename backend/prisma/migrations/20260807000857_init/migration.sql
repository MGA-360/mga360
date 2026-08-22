-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('FIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('OTIMO', 'BOM', 'REGULAR', 'RUIM');

-- CreateEnum
CREATE TYPE "CalendarStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "DiagnosticModule" AS ENUM ('CADASTRO', 'PLANEJAMENTO', 'FINANCEIRO', 'CUSTOS', 'ESTOQUE', 'PESSOAS');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "totalAreaHa" DECIMAL(12,2),
    "productiveAreaHa" DECIMAL(12,2),
    "managementStartDate" TIMESTAMP(3),
    "activitiesSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "seqNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER,
    "acquisitionValue" DECIMAL(14,2),
    "condition" "AssetCondition",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_goals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "annualGoal" DECIMAL(14,2) NOT NULL,
    "achievedValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "year" INTEGER NOT NULL,

    CONSTRAINT "planning_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_calendar_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "activityId" TEXT,
    "plannedActivity" TEXT NOT NULL,
    "status" "CalendarStatus" NOT NULL DEFAULT 'PLANEJADO',

    CONSTRAINT "planning_calendar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_cycles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "production_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activityId" TEXT,
    "value" DECIMAL(14,2) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costType" "CostType" NOT NULL,

    CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "minStock" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "entryQty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "exitQty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "chargesPct" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "activitiesPerformed" TEXT,
    "notes" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_progress" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" "DiagnosticModule" NOT NULL,
    "completionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "snapshotJson" JSONB NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "activities_companyId_idx" ON "activities"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "activities_companyId_seqNumber_key" ON "activities"("companyId", "seqNumber");

-- CreateIndex
CREATE INDEX "assets_companyId_idx" ON "assets"("companyId");

-- CreateIndex
CREATE INDEX "planning_goals_companyId_idx" ON "planning_goals"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "planning_goals_activityId_year_key" ON "planning_goals"("activityId", "year");

-- CreateIndex
CREATE INDEX "planning_calendar_items_companyId_year_month_idx" ON "planning_calendar_items"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "production_cycles_companyId_idx" ON "production_cycles"("companyId");

-- CreateIndex
CREATE INDEX "finance_entries_companyId_type_date_idx" ON "finance_entries"("companyId", "type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cost_categories_name_key" ON "cost_categories"("name");

-- CreateIndex
CREATE INDEX "inventory_items_companyId_idx" ON "inventory_items"("companyId");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_progress_companyId_module_key" ON "diagnostic_progress"("companyId", "module");

-- CreateIndex
CREATE INDEX "reports_companyId_idx" ON "reports"("companyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_goals" ADD CONSTRAINT "planning_goals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_goals" ADD CONSTRAINT "planning_goals_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_calendar_items" ADD CONSTRAINT "planning_calendar_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_calendar_items" ADD CONSTRAINT "planning_calendar_items_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_cycles" ADD CONSTRAINT "production_cycles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_cycles" ADD CONSTRAINT "production_cycles_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_progress" ADD CONSTRAINT "diagnostic_progress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
