import { Request, Response } from "express";
import pool from "../config/db";
import { LoaiPhong } from "../types";

export const getAllLoaiPhong = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM loai_phong ORDER BY id");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching loai phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLoaiPhongById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM loai_phong WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Loại phòng không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching loai phong by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createLoaiPhong = async (req: Request, res: Response) => {
  const {
    ten_loai_phong,
    gia_qua_dem,
    gia_gio_dau,
    gia_theo_gio,
    gia_qua_ngay,
  } = req.body as LoaiPhong;

  try {
    const result = await pool.query(
      "INSERT INTO loai_phong (ten_loai_phong, gia_qua_dem, gia_gio_dau, gia_theo_gio, gia_qua_ngay) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ten_loai_phong, gia_qua_dem, gia_gio_dau, gia_theo_gio, gia_qua_ngay]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating loai phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLoaiPhong = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    ten_loai_phong,
    gia_qua_dem,
    gia_gio_dau,
    gia_theo_gio,
    gia_qua_ngay,
  } = req.body as LoaiPhong;

  try {
    const result = await pool.query(
      "UPDATE loai_phong SET ten_loai_phong = $1, gia_qua_dem = $2, gia_gio_dau = $3, gia_theo_gio = $4, gia_qua_ngay = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *",
      [ten_loai_phong, gia_qua_dem, gia_gio_dau, gia_theo_gio, gia_qua_ngay, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Loại phòng không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating loai phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteLoaiPhong = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Kiểm tra xem loại phòng có đang được sử dụng không
    const checkUsage = await pool.query(
      "SELECT COUNT(*) FROM phong WHERE loai_phong_id = $1",
      [id]
    );

    if (parseInt(checkUsage.rows[0].count) > 0) {
      return res
        .status(400)
        .json({ message: "Không thể xóa loại phòng đang được sử dụng" });
    }

    const result = await pool.query(
      "DELETE FROM loai_phong WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Loại phòng không tồn tại" });
    }

    res.status(200).json({ message: "Xóa loại phòng thành công" });
  } catch (error) {
    console.error("Error deleting loai phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};
