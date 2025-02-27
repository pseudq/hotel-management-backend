import { Request, Response } from "express";
import pool from "../config/db";
import { DichVu, SuDungDichVu } from "../types";

export const getAllDichVu = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM dich_vu ORDER BY ten_dich_vu"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching dich vu:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDichVuById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM dich_vu WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching dich vu by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createDichVu = async (req: Request, res: Response) => {
  const { ten_dich_vu, gia, mo_ta } = req.body as DichVu;

  try {
    const result = await pool.query(
      "INSERT INTO dich_vu (ten_dich_vu, gia, mo_ta) VALUES ($1, $2, $3) RETURNING *",
      [ten_dich_vu, gia, mo_ta]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating dich vu:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateDichVu = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ten_dich_vu, gia, mo_ta } = req.body as DichVu;

  try {
    const result = await pool.query(
      `UPDATE dich_vu SET 
        ten_dich_vu = $1, 
        gia = $2, 
        mo_ta = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 RETURNING *`,
      [ten_dich_vu, gia, mo_ta, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating dich vu:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteDichVu = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Kiểm tra xem dịch vụ có đang được sử dụng không
    const checkUsage = await pool.query(
      "SELECT COUNT(*) FROM su_dung_dich_vu WHERE dich_vu_id = $1",
      [id]
    );

    if (parseInt(checkUsage.rows[0].count) > 0) {
      return res
        .status(400)
        .json({ message: "Không thể xóa dịch vụ đã được sử dụng" });
    }

    const result = await pool.query(
      "DELETE FROM dich_vu WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    res.status(200).json({ message: "Xóa dịch vụ thành công" });
  } catch (error) {
    console.error("Error deleting dich vu:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const themDichVuChoDatPhong = async (req: Request, res: Response) => {
  const { dat_phong_id } = req.params;
  const { dich_vu_id, so_luong, ghi_chu } = req.body as SuDungDichVu;

  try {
    // Kiểm tra xem đặt phòng có tồn tại và đang ở trạng thái 'đã nhận' không
    const checkDatPhong = await pool.query(
      "SELECT * FROM dat_phong WHERE id = $1 AND trang_thai = 'đã nhận'",
      [dat_phong_id]
    );

    if (checkDatPhong.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "Đặt phòng không tồn tại hoặc không ở trạng thái nhận phòng",
        });
    }

    // Lấy giá dịch vụ
    const dichVuResult = await pool.query(
      "SELECT * FROM dich_vu WHERE id = $1",
      [dich_vu_id]
    );

    if (dichVuResult.rows.length === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại" });
    }

    const gia_tien = dichVuResult.rows[0].gia;

    // Thêm dịch vụ vào đặt phòng
    const result = await pool.query(
      `INSERT INTO su_dung_dich_vu (
        dat_phong_id, dich_vu_id, so_luong, gia_tien, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dat_phong_id, dich_vu_id, so_luong || 1, gia_tien, ghi_chu]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding dich vu to dat phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDichVuByDatPhong = async (req: Request, res: Response) => {
  const { dat_phong_id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      WHERE sd.dat_phong_id = $1
      ORDER BY sd.thoi_gian_su_dung
    `,
      [dat_phong_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching dich vu by dat phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const xoaDichVuDatPhong = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM su_dung_dich_vu WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Dịch vụ đã sử dụng không tồn tại" });
    }

    res.status(200).json({ message: "Xóa dịch vụ đã sử dụng thành công" });
  } catch (error) {
    console.error("Error deleting su dung dich vu:", error);
    res.status(500).json({ message: "Server error" });
  }
};
