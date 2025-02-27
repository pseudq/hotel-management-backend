import { Request, Response, NextFunction } from "express";

// Đây chỉ là middleware xác thực đơn giản
// Trong thực tế, bạn nên sử dụng JWT hoặc OAuth
export const authMiddleware = (
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
