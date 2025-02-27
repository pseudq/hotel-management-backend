import pool from "../config/db";
import type { DatPhong } from "../types";

export const findAll = async (): Promise<any[]> => {
  const result = await pool.query(`
    SELECT dp.*, 
      kh.ho_ten, kh.cmnd,
      p.so_phong, p.so_tang,
      lp.ten_loai_phong
    FROM dat_phong dp
    JOIN khach_hang kh ON dp.khach_hang_id = kh.id
    JOIN phong p ON dp.phong_id = p.id
    JOIN loai_phong lp ON p.loai_phong_id = lp.id
    ORDER BY dp.thoi_gian_vao DESC
  `);
  return result.rows;
};

export const findById = async (id: number): Promise<any | null> => {
  const result = await pool.query(
    `
    SELECT dp.*, 
      kh.ho_ten, kh.cmnd,
      p.so_phong, p.so_tang,
      lp.ten_loai_phong
    FROM dat_phong dp
    JOIN khach_hang kh ON dp.khach_hang_id = kh.id
    JOIN phong p ON dp.phong_id = p.id
    JOIN loai_phong lp ON p.loai_phong_id = lp.id
    WHERE dp.id = $1
  `,
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const create = async (datPhong: DatPhong): Promise<DatPhong> => {
  const result = await pool.query(
    `INSERT INTO dat_phong (
      khach_hang_id, phong_id, thoi_gian_vao, thoi_gian_du_kien_ra, 
      loai_dat, trang_thai, ghi_chu
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      datPhong.khach_hang_id,
      datPhong.phong_id,
      datPhong.thoi_gian_vao,
      datPhong.thoi_gian_du_kien_ra,
      datPhong.loai_dat,
      datPhong.trang_thai || "đã nhận",
      datPhong.ghi_chu,
    ]
  );
  return result.rows[0];
};

export const update = async (
  id: number,
  datPhong: Partial<DatPhong>
): Promise<DatPhong | null> => {
  // Get current booking
  const current = await pool.query("SELECT * FROM dat_phong WHERE id = $1", [
    id,
  ]);
  if (current.rows.length === 0) return null;

  const currentData = current.rows[0];

  const result = await pool.query(
    `UPDATE dat_phong SET 
      khach_hang_id = $1, 
      phong_id = $2, 
      thoi_gian_vao = $3, 
      thoi_gian_du_kien_ra = $4, 
      loai_dat = $5, 
      trang_thai = $6, 
      ghi_chu = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $8 RETURNING *`,
    [
      datPhong.khach_hang_id || currentData.khach_hang_id,
      datPhong.phong_id || currentData.phong_id,
      datPhong.thoi_gian_vao || currentData.thoi_gian_vao,
      datPhong.thoi_gian_du_kien_ra || currentData.thoi_gian_du_kien_ra,
      datPhong.loai_dat || currentData.loai_dat,
      datPhong.trang_thai || currentData.trang_thai,
      datPhong.ghi_chu || currentData.ghi_chu,
      id,
    ]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

export const getKhachDangO = async (): Promise<any[]> => {
  const result = await pool.query(`
    SELECT * FROM khach_dang_o ORDER BY so_tang, so_phong
  `);
  return result.rows;
};

export const getDichVuByDatPhong = async (
  datPhongId: number
): Promise<any[]> => {
  const result = await pool.query(
    `
    SELECT sd.*, dv.ten_dich_vu
    FROM su_dung_dich_vu sd
    JOIN dich_vu dv ON sd.dich_vu_id = dv.id
    WHERE sd.dat_phong_id = $1
  `,
    [datPhongId]
  );
  return result.rows;
};
