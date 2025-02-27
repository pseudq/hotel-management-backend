import { Router } from "express";
import * as dichVuController from "../controllers/dichVuController";

const router = Router();

router.get("/", dichVuController.getAllDichVu);
router.get("/:id", dichVuController.getDichVuById);
router.post("/", dichVuController.createDichVu);
router.put("/:id", dichVuController.updateDichVu);
router.delete("/:id", dichVuController.deleteDichVu);

// API cho sử dụng dịch vụ
router.get("/dat-phong/:dat_phong_id", dichVuController.getDichVuByDatPhong);
router.post("/dat-phong/:dat_phong_id", dichVuController.themDichVuChoDatPhong);
router.delete("/su-dung/:id", dichVuController.xoaDichVuDatPhong);

export default router;
