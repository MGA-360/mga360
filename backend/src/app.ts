import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import { authRouter } from "./routes/auth.routes";
import { companiesRouter } from "./routes/companies.routes";
import { activitiesRouter } from "./routes/activities.routes";
import { assetsRouter } from "./routes/assets.routes";
import { planningRouter } from "./routes/planning.routes";
import { financeRouter } from "./routes/finance.routes";
import { costsRouter } from "./routes/costs.routes";
import { inventoryRouter } from "./routes/inventory.routes";
import { employeesRouter } from "./routes/employees.routes";
import { dashboardRouter, radarRouter, decisionRouter } from "./routes/results.routes";
import { progressRouter } from "./routes/progress.routes";
import { reportsRouter } from "./routes/reports.routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Serve os PDFs de relatório gerados por report.service.ts (storage local —
// trocar por bucket assinado em produção, ver comentário no service).
app.use(
  "/files",
  helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }),
  express.static(path.join(__dirname, "..", "storage"))
);

app.use("/auth", authRouter);
app.use("/companies", companiesRouter);
app.use("/activities", activitiesRouter);
app.use("/assets", assetsRouter);
app.use("/planning", planningRouter);
app.use("/finance", financeRouter);
app.use("/costs", costsRouter);
app.use("/inventory", inventoryRouter);
app.use("/employees", employeesRouter);
app.use("/dashboard", dashboardRouter);
app.use("/radar", radarRouter);
app.use("/decision", decisionRouter);
app.use("/progress", progressRouter);
app.use("/reports", reportsRouter);

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
app.use(errorHandler);
