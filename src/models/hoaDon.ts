import pool from "../config/db";
import type { HoaDon } from "../types";

export const findAll = async (): Promise<any[]> => {
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
  return result.rows;
};

export const findById = async (id: number): Promise<any | null> => {
  const result = await pool.query(
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
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (hoaDon: HoaDon): Promise<HoaDon> => {
  const result = await pool.query(
    `INSERT INTO hoa_don (
      dat_phong_id, khach_hang_id, thoi_gian_tra, 
      tong_tien_phong, tong_tien_dich_vu, tong_tien,
      phuong_thuc_thanh_toan, trang_thai_thanh_toan, ghi_chu
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      hoaDon.dat_phong_id,
      hoaDon.khach_hang_id,
      hoaDon.thoi_gian_tra,
      hoaDon.tong_tien_phong,
      hoaDon.tong_tien_dich_vu,
      hoaDon.tong_tien,
      hoaDon.phuong_thuc_thanh_toan,
      hoaDon.trang_thai_thanh_toan || "chưa thanh toán",
      hoaDon.ghi_chu,
    ]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  hoaDon: Partial<HoaDon>
): Promise<HoaDon | null> => {
  const result = await pool.query(
    `UPDATE hoa_don SET 
      phuong_thuc_thanh_toan = $1, 
      trang_thai_thanh_toan = $2, 
      ghi_chu = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4 RETURNING *`,
    [
      hoaDon.phuong_thuc_thanh_toan,
      hoaDon.trang_thai_thanh_toan,
      hoaDon.ghi_chu,
      id,
    ]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const getThongKe = async (
  tuNgay?: string,
  denNgay?: string
): Promise<any> => {
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

  if (tuNgay) {
    params.push(tuNgay);
    query += ` AND thoi_gian_tra >= $${params.length}`;
  }

  if (denNgay) {
    params.push(denNgay);
    query += ` AND thoi_gian_tra <= $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows[0];
};

export const calculateRoomCharge = (
  loaiDat: string,
  thoiGianVao: Date,
  thoiGianRa: Date,
  loaiPhong: any
): number => {
  const thoiGianSuDung =
    (thoiGianRa.getTime() - thoiGianVao.getTime()) / (60 * 60 * 1000); // Số giờ
  let tongTienPhong = 0;

  if (loaiDat === "giờ") {
    tongTienPhong =
      loaiPhong.gia_gio_dau +
      Math.max(0, Math.ceil(thoiGianSuDung) - 1) * loaiPhong.gia_theo_gio;
  } else if (loaiDat === "ngày") {
    tongTienPhong = Math.ceil(thoiGianSuDung / 24) * loaiPhong.gia_qua_ngay;
  } else if (loaiDat === "đêm") {
    tongTienPhong = Math.ceil(thoiGianSuDung / 24) * loaiPhong.gia_qua_dem;
  }

  return tongTienPhong;
};
