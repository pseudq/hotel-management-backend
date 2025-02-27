import { Request, Response } from "express";
import pool from "../config/db";
import { KhachHang } from "../types";

export const getAllKhachHang = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM khach_hang ORDER BY ho_ten");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching khach hang:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getKhachHangById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM khach_hang WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching khach hang by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getKhachHangByCMND = async (req: Request, res: Response) => {
  const { cmnd } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM khach_hang WHERE cmnd = $1",
      [cmnd]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching khach hang by CMND:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createKhachHang = async (req: Request, res: Response) => {
  const { ho_ten, cmnd, so_dien_thoai, email, dia_chi } = req.body as KhachHang;

  try {
    // Kiểm tra xem CMND đã tồn tại chưa
    const checkKhachHang = await pool.query(
      "SELECT * FROM khach_hang WHERE cmnd = $1",
      [cmnd]
    );

    if (checkKhachHang.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "CMND đã tồn tại trong hệ thống" });
    }

    const result = await pool.query(
      "INSERT INTO khach_hang (ho_ten, cmnd, so_dien_thoai, email, dia_chi) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ho_ten, cmnd, so_dien_thoai, email, dia_chi]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating khach hang:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateKhachHang = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ho_ten, cmnd, so_dien_thoai, email, dia_chi } = req.body as KhachHang;

  try {
    // Kiểm tra xem khách hàng có tồn tại không
    const current = await pool.query("SELECT * FROM khach_hang WHERE id = $1", [
      id,
    ]);

    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    // Kiểm tra xem CMND đã tồn tại chưa (nếu đổi CMND)
    if (cmnd !== current.rows[0].cmnd) {
      const checkKhachHang = await pool.query(
        "SELECT * FROM khach_hang WHERE cmnd = $1",
        [cmnd]
      );

      if (checkKhachHang.rows.length > 0) {
        return res
          .status(400)
          .json({ message: "CMND đã tồn tại trong hệ thống" });
      }
    }

    const result = await pool.query(
      `UPDATE khach_hang SET 
        ho_ten = $1, 
        cmnd = $2, 
        so_dien_thoai = $3, 
        email = $4, 
        dia_chi = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 RETURNING *`,
      [ho_ten, cmnd, so_dien_thoai, email, dia_chi, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating khach hang:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteKhachHang = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Kiểm tra xem khách hàng có đang có đặt phòng nào không
    const checkUsage = await pool.query(
      "SELECT COUNT(*) FROM dat_phong WHERE khach_hang_id = $1 AND trang_thai IN ('đã đặt', 'đã nhận')",
      [id]
    );

    if (parseInt(checkUsage.rows[0].count) > 0) {
      return res
        .status(400)
        .json({ message: "Không thể xóa khách hàng đang có đặt phòng" });
    }

    const result = await pool.query(
      "DELETE FROM khach_hang WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Khách hàng không tồn tại" });
    }

    res.status(200).json({ message: "Xóa khách hàng thành công" });
  } catch (error) {
    console.error("Error deleting khach hang:", error);
    res.status(500).json({ message: "Server error" });
  }
};
