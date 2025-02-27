import { Router } from "express";
import * as loaiPhongController from "../controllers/loaiPhongController";

const router = Router();

router.get("/", loaiPhongController.getAllLoaiPhong);
router.get("/:id", loaiPhongController.getLoaiPhongById);
router.post("/", loaiPhongController.createLoaiPhong);
router.put("/:id", loaiPhongController.updateLoaiPhong);
router.delete("/:id", loaiPhongController.deleteLoaiPhong);

export default router;
