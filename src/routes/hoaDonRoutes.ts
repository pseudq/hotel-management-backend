import { Router } from "express";
import * as hoaDonController from "../controllers/hoaDonController";

const router = Router();

router.get("/", hoaDonController.getAllHoaDon);
router.get("/thong-ke", hoaDonController.getThongKe);
router.get("/:id", hoaDonController.getHoaDonById);
router.put("/:id", hoaDonController.updateHoaDon);

export default router;
