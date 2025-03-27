import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Middleware xác thực JWT
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Kiểm tra header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Nếu không có token, kiểm tra API key
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Nếu có API key hợp lệ, cho phép truy cập
    return next();
  }

  // Lấy token từ header
  const token = authHeader.split(" ")[1];

  try {
    // Xác thực token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_key"
    );

    // Gán thông tin user vào request để sử dụng ở các middleware tiếp theo
    (req as any).user = decoded;

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Middleware kiểm tra vai trò
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Nếu không có thông tin user (đã xác thực bằng API key)
    if (!(req as any).user) {
      // Cho phép truy cập nếu sử dụng API key
      if (req.headers["x-api-key"] === process.env.API_KEY) {
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = (req as any).user.vai_tro;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    next();
  };
};

// Middleware kiểm tra API key
export const apiKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
};
