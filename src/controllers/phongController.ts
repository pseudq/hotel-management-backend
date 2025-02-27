import { Request, Response } from "express";
import pool from "../config/db";
import { Phong } from "../types";

export const getAllPhong = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, lp.ten_loai_phong 
      FROM phong p
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      ORDER BY p.so_tang, p.so_phong
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPhongById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT p.*, lp.ten_loai_phong 
      FROM phong p
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE p.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching phong by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createPhong = async (req: Request, res: Response) => {
  const { so_phong, so_tang, loai_phong_id, trang_thai } = req.body as Phong;

  try {
    // Kiểm tra xem số phòng đã tồn tại chưa
    const checkPhong = await pool.query(
      "SELECT * FROM phong WHERE so_phong = $1",
      [so_phong]
    );

    if (checkPhong.rows.length > 0) {
      return res.status(400).json({ message: "Số phòng đã tồn tại" });
    }

    const result = await pool.query(
      "INSERT INTO phong (so_phong, so_tang, loai_phong_id, trang_thai) VALUES ($1, $2, $3, $4) RETURNING *",
      [so_phong, so_tang, loai_phong_id, trang_thai || "trống"]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePhong = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { so_phong, so_tang, loai_phong_id, trang_thai } = req.body as Phong;

  try {
    // Kiểm tra xem số phòng đã tồn tại chưa (nếu đổi số phòng)
    const current = await pool.query(
      "SELECT so_phong FROM phong WHERE id = $1",
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    if (so_phong !== current.rows[0].so_phong) {
      const checkPhong = await pool.query(
        "SELECT * FROM phong WHERE so_phong = $1",
        [so_phong]
      );

      if (checkPhong.rows.length > 0) {
        return res.status(400).json({ message: "Số phòng đã tồn tại" });
      }
    }

    const result = await pool.query(
      "UPDATE phong SET so_phong = $1, so_tang = $2, loai_phong_id = $3, trang_thai = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
      [so_phong, so_tang, loai_phong_id, trang_thai, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deletePhong = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Kiểm tra xem phòng có đang được sử dụng không
    const checkUsage = await pool.query(
      "SELECT COUNT(*) FROM dat_phong WHERE phong_id = $1 AND trang_thai IN ('đã đặt', 'đã nhận')",
      [id]
    );

    if (parseInt(checkUsage.rows[0].count) > 0) {
      return res
        .status(400)
        .json({ message: "Không thể xóa phòng đang được sử dụng" });
    }

    const result = await pool.query(
      "DELETE FROM phong WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    res.status(200).json({ message: "Xóa phòng thành công" });
  } catch (error) {
    console.error("Error deleting phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPhongTrong = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, lp.ten_loai_phong 
      FROM phong p
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE p.trang_thai = 'trống'
      ORDER BY p.so_tang, p.so_phong
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching phong trong:", error);
    res.status(500).json({ message: "Server error" });
  }
};
