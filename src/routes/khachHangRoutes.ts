import { Router } from "express";
import * as khachHangController from "../controllers/khachHangController";

const router = Router();

router.get("/", khachHangController.getAllKhachHang);
router.get("/:id", khachHangController.getKhachHangById);
router.get("/cmnd/:cmnd", khachHangController.getKhachHangByCMND);
router.post("/", khachHangController.createKhachHang);
router.put("/:id", khachHangController.updateKhachHang);
router.delete("/:id", khachHangController.deleteKhachHang);

export default router;
