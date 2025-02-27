import { Router } from "express";
import * as datPhongController from "../controllers/datPhongController";

const router = Router();

router.get("/", datPhongController.getAllDatPhong);
router.get("/khach-dang-o", datPhongController.getKhachDangO);
router.get("/:id", datPhongController.getDatPhongById);
router.post("/", datPhongController.createDatPhong);
router.put("/:id", datPhongController.updateDatPhong);
router.post("/:id/tra-phong", datPhongController.traPhong);

export default router;
