import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/errorHandler";
import { authMiddleware } from "./middlewares/auth";

// Import routes
import phongRoutes from "./routes/phongRoutes";
import loaiPhongRoutes from "./routes/loaiPhongRoutes";
import khachHangRoutes from "./routes/khachHangRoutes";
import datPhongRoutes from "./routes/datPhongRoutes";
import dichVuRoutes from "./routes/dichVuRoutes";
import hoaDonRoutes from "./routes/hoaDonRoutes";
import authRoutes from "./routes/authRoutes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Chào mừng đến với API quản lý khách sạn" });
});

// Auth routes - không cần xác thực trước
app.use("/api/auth", authRoutes);

// API routes with authentication
app.use("/api/phong", authMiddleware, phongRoutes);
app.use("/api/loai-phong", authMiddleware, loaiPhongRoutes);
app.use("/api/khach-hang", authMiddleware, khachHangRoutes);
app.use("/api/dat-phong", authMiddleware, datPhongRoutes);
app.use("/api/dich-vu", authMiddleware, dichVuRoutes);
app.use("/api/hoa-don", authMiddleware, hoaDonRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
