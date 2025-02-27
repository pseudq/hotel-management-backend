import { Request, Response } from "express";
import pool from "../config/db";
import { HoaDon } from "../types";

export const getAllHoaDon = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT hd.*, 
        kh.ho_ten, kh.cmnd,
        p.so_phong, p.so_tang
      FROM hoa_don hd
      JOIN khach_hang kh ON hd.khach_hang_id = kh.id
      JOIN dat_phong dp ON hd.dat_phong_id = dp.id
      JOIN phong p ON dp.phong_id = p.id
      ORDER BY hd.thoi_gian_tra DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching hoa don:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getHoaDonById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const hoaDonResult = await pool.query(
      `
      SELECT hd.*, 
        kh.ho_ten, kh.cmnd, kh.so_dien_thoai, kh.email,
        p.so_phong, p.so_tang,
        lp.ten_loai_phong,
        dp.thoi_gian_vao, dp.loai_dat
      FROM hoa_don hd
      JOIN khach_hang kh ON hd.khach_hang_id = kh.id
      JOIN dat_phong dp ON hd.dat_phong_id = dp.id
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE hd.id = $1
    `,
      [id]
    );

    if (hoaDonResult.rows.length === 0) {
      return res.status(404).json({ message: "Hóa đơn không tồn tại" });
    }

    // Lấy thông tin dịch vụ đã sử dụng
    const dichVuResult = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      WHERE sd.dat_phong_id = $1
    `,
      [hoaDonResult.rows[0].dat_phong_id]
    );

    const response = {
      ...hoaDonResult.rows[0],
      dich_vu: dichVuResult.rows,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching hoa don by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateHoaDon = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { phuong_thuc_thanh_toan, trang_thai_thanh_toan, ghi_chu } =
    req.body as HoaDon;

  try {
    const result = await pool.query(
      `UPDATE hoa_don SET 
        phuong_thuc_thanh_toan = $1, 
        trang_thai_thanh_toan = $2, 
        ghi_chu = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 RETURNING *`,
      [phuong_thuc_thanh_toan, trang_thai_thanh_toan, ghi_chu, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Hóa đơn không tồn tại" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating hoa don:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getThongKe = async (req: Request, res: Response) => {
  const { tu_ngay, den_ngay } = req.query;

  try {
    let query = `
      SELECT 
        COUNT(*) as tong_hoa_don,
        SUM(tong_tien) as tong_doanh_thu,
        SUM(tong_tien_phong) as tong_tien_phong,
        SUM(tong_tien_dich_vu) as tong_tien_dich_vu,
        COUNT(CASE WHEN trang_thai_thanh_toan = 'đã thanh toán' THEN 1 END) as da_thanh_toan,
        COUNT(CASE WHEN trang_thai_thanh_toan = 'chưa thanh toán' THEN 1 END) as chua_thanh_toan
      FROM hoa_don
      WHERE 1=1
    `;

    const params: any[] = [];

    if (tu_ngay) {
      params.push(tu_ngay);
      query += ` AND thoi_gian_tra >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      query += ` AND thoi_gian_tra <= $${params.length}`;
    }

    const result = await pool.query(query, params);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error getting thong ke:", error);
    res.status(500).json({ message: "Server error" });
  }
};
