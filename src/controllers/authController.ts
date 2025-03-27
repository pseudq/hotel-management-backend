import type { Request, Response } from "express";
import pool from "../config/db";
import jwt from "jsonwebtoken";

// Đăng nhập
export const login = async (req: Request, res: Response) => {
  const { ten_dang_nhap, mat_khau } = req.body;

  if (!ten_dang_nhap || !mat_khau) {
    return res.status(400).json({
      message: "Vui lòng cung cấp tên đăng nhập và mật khẩu",
    });
  }

  try {
    // Tìm nhân viên theo tên đăng nhập
    const result = await pool.query(
      "SELECT * FROM nhan_vien WHERE ten_dang_nhap = $1",
      [ten_dang_nhap]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const nhanVien = result.rows[0];

    // Kiểm tra mật khẩu
    // Lưu ý: Trong môi trường thực tế, mật khẩu nên được băm (hash)
    // Hiện tại chúng ta đang so sánh trực tiếp vì dữ liệu mẫu lưu mật khẩu dạng plaintext
    const isPasswordValid = nhanVien.mat_khau === mat_khau;

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        id: nhanVien.id,
        ten_dang_nhap: nhanVien.ten_dang_nhap,
        vai_tro: nhanVien.vai_tro,
      },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "24h" }
    );

    // Trả về thông tin nhân viên và token
    res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      nhan_vien: {
        id: nhanVien.id,
        ho_ten: nhanVien.ho_ten,
        ten_dang_nhap: nhanVien.ten_dang_nhap,
        email: nhanVien.email,
        vai_tro: nhanVien.vai_tro,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy thông tin nhân viên đang đăng nhập
export const getProfile = async (req: Request, res: Response) => {
  try {
    // req.user được set bởi authMiddleware
    const userId = (req as any).user.id;

    const result = await pool.query(
      "SELECT id, ho_ten, ten_dang_nhap, email, so_dien_thoai, dia_chi, ngay_sinh, vai_tro, ngay_bat_dau_lam FROM nhan_vien WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin nhân viên" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Đổi mật khẩu
export const changePassword = async (req: Request, res: Response) => {
  const { mat_khau_cu, mat_khau_moi } = req.body;
  const userId = (req as any).user.id;

  if (!mat_khau_cu || !mat_khau_moi) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp mật khẩu cũ và mật khẩu mới" });
  }

  try {
    // Kiểm tra mật khẩu cũ
    const checkResult = await pool.query(
      "SELECT mat_khau FROM nhan_vien WHERE id = $1",
      [userId]
    );

    if (checkResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin nhân viên" });
    }

    const currentPassword = checkResult.rows[0].mat_khau;

    if (currentPassword !== mat_khau_cu) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    // Cập nhật mật khẩu mới
    await pool.query(
      "UPDATE nhan_vien SET mat_khau = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [mat_khau_moi, userId]
    );

    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy danh sách nhân viên (chỉ dành cho quản lý)
export const getAllNhanVien = async (req: Request, res: Response) => {
  try {
    // Kiểm tra vai trò
    const userRole = (req as any).user.vai_tro;

    if (userRole !== "quản lý") {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const result = await pool.query(
      "SELECT id, ho_ten, ten_dang_nhap, email, so_dien_thoai, dia_chi, ngay_sinh, vai_tro, ngay_bat_dau_lam FROM nhan_vien ORDER BY ho_ten"
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching nhan vien:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Thêm nhân viên mới (chỉ dành cho quản lý)
export const createNhanVien = async (req: Request, res: Response) => {
  const {
    ho_ten,
    ten_dang_nhap,
    mat_khau,
    email,
    so_dien_thoai,
    dia_chi,
    ngay_sinh,
    vai_tro,
    ngay_bat_dau_lam,
  } = req.body;

  // Kiểm tra vai trò
  const userRole = (req as any).user.vai_tro;

  if (userRole !== "quản lý") {
    return res
      .status(403)
      .json({ message: "Không có quyền thực hiện thao tác này" });
  }

  try {
    // Kiểm tra xem tên đăng nhập đã tồn tại chưa
    const checkUser = await pool.query(
      "SELECT * FROM nhan_vien WHERE ten_dang_nhap = $1",
      [ten_dang_nhap]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    // Thêm nhân viên mới
    const result = await pool.query(
      `INSERT INTO nhan_vien (
        ho_ten, ten_dang_nhap, mat_khau, email, so_dien_thoai, 
        dia_chi, ngay_sinh, vai_tro, ngay_bat_dau_lam
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        ho_ten,
        ten_dang_nhap,
        mat_khau,
        email,
        so_dien_thoai,
        dia_chi,
        ngay_sinh,
        vai_tro,
        ngay_bat_dau_lam,
      ]
    );

    // Loại bỏ mật khẩu từ kết quả trả về
    const { mat_khau: _, ...nhanVienData } = result.rows[0];

    res.status(201).json(nhanVienData);
  } catch (error) {
    console.error("Error creating nhan vien:", error);
    res.status(500).json({ message: "Server error" });
  }
};
