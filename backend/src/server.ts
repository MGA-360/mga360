import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`MGA 360 API rodando em http://localhost:${PORT}`);
});
