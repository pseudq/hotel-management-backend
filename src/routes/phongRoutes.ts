import { Router } from "express";
import * as phongController from "../controllers/phongController";

const router = Router();

router.get("/", phongController.getAllPhong);
router.get("/trong", phongController.getPhongTrong);
router.get("/:id", phongController.getPhongById);
router.post("/", phongController.createPhong);
router.put("/:id", phongController.updatePhong);
router.delete("/:id", phongController.deletePhong);

export default router;
