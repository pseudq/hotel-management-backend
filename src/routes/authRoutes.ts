import { Router } from "express";
import * as authController from "../controllers/authController";
import { authMiddleware, checkRole } from "../middlewares/auth";

const router = Router();

// Route đăng nhập - không cần xác thực
router.post("/login", authController.login);

// Route lấy thông tin cá nhân - cần xác thực
router.get("/profile", authMiddleware, authController.getProfile);

// Route đổi mật khẩu - cần xác thực
router.post("/change-password", authMiddleware, authController.changePassword);

// Route quản lý nhân viên - chỉ dành cho quản lý
router.get(
  "/nhan-vien",
  authMiddleware,
  checkRole(["quản lý"]),
  authController.getAllNhanVien
);

router.post(
  "/nhan-vien",
  authMiddleware,
  checkRole(["quản lý"]),
  authController.createNhanVien
);

export default router;
