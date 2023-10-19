import create2StatelessRoutes from "./stateless/create2.stateless.routes";
import create2SessionRoutes from "./session/create2.session.routes";

import { Router } from "express";
import config from "../../../../config";

const router = Router();

if (config.features.create2 === "true") {
  router.use("/", create2StatelessRoutes);
  router.use("/", create2SessionRoutes);
}

export default router;
