import type { Request, Response } from "express";
import pool from "../config/db";
import type { DatPhong } from "../types";
import { calculateOptimalRoomCharge } from "../models/hoaDon";

export const getAllDatPhong = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dp.*, 
        kh.ho_ten, kh.cmnd,
        p.so_phong, p.so_tang,
        lp.ten_loai_phong,
        nv.ho_ten as nhan_vien_ho_ten
      FROM dat_phong dp
      JOIN khach_hang kh ON dp.khach_hang_id = kh.id
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      LEFT JOIN nhan_vien nv ON dp.nhan_vien_id = nv.id
      ORDER BY dp.thoi_gian_vao DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching dat phong:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDatPhongById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const datPhongResult = await pool.query(
      `
      SELECT dp.*, 
        kh.ho_ten, kh.cmnd,
        p.so_phong, p.so_tang,
        lp.ten_loai_phong,
        nv.ho_ten as nhan_vien_ho_ten
      FROM dat_phong dp
      JOIN khach_hang kh ON dp.khach_hang_id = kh.id
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      LEFT JOIN nhan_vien nv ON dp.nhan_vien_id = nv.id
      WHERE dp.id = $1
    `,
      [id]
    );

    if (datPhongResult.rows.length === 0) {
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    // Lấy thông tin dịch vụ đã sử dụng
    const dichVuResult = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu, nv.ho_ten as nhan_vien_ho_ten
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      LEFT JOIN nhan_vien nv ON sd.nhan_vien_id = nv.id
      WHERE sd.dat_phong_id = $1
    `,
      [id]
    );

    const response = {
      ...datPhongResult.rows[0],
      dich_vu: dichVuResult.rows,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching dat phong by id:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Cập nhật hàm createDatPhong để lưu thông tin nhân viên
export const createDatPhong = async (req: Request, res: Response) => {
  const {
    khach_hang_id,
    phong_id,
    thoi_gian_vao,
    thoi_gian_du_kien_ra,
    trang_thai,
    ghi_chu,
  } = req.body as DatPhong;

  // Validate thời gian vào
  if (new Date(thoi_gian_vao) > new Date()) {
    return res
      .status(400)
      .json({ message: "Thời gian vào không thể trong tương lai" });
  }

  // Bắt đầu transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Kiểm tra xem phòng có sẵn sàng không
    const checkPhong = await client.query(
      "SELECT trang_thai FROM phong WHERE id = $1",
      [phong_id]
    );

    if (checkPhong.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    if (checkPhong.rows[0].trang_thai !== "trống" && trang_thai === "đã nhận") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Phòng không sẵn sàng để nhận khách" });
    }

    // Lấy ID nhân viên từ token
    const nhanVienId = (req as any).user?.id;

    // Đảm bảo thời gian vào được lưu đúng định dạng UTC
    const thoiGianVao = new Date(thoi_gian_vao);
    // Sử dụng trực tiếp thời gian từ client mà không thay đổi timezone
    const datPhongResult = await client.query(
      `INSERT INTO dat_phong (
        khach_hang_id, phong_id, nhan_vien_id, thoi_gian_vao, thoi_gian_du_kien_ra,
        trang_thai, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        khach_hang_id,
        phong_id,
        nhanVienId, // Thêm ID nhân viên
        thoiGianVao, // Sử dụng trực tiếp thời gian từ request
        thoi_gian_du_kien_ra,
        trang_thai || "đã nhận",
        ghi_chu,
      ]
    );

    // Cập nhật trạng thái phòng nếu trang thái là 'đã nhận'
    if (trang_thai === "đã nhận") {
      await client.query(
        "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [phong_id]
      );
    }

    await client.query("COMMIT");

    res.status(201).json(datPhongResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating dat phong:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const updateDatPhong = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    khach_hang_id,
    phong_id,
    thoi_gian_vao,
    thoi_gian_du_kien_ra,
    trang_thai,
    ghi_chu,
  } = req.body as DatPhong;

  // Bắt đầu transaction
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lấy thông tin đặt phòng hiện tại
    const currentDatPhong = await client.query(
      "SELECT * FROM dat_phong WHERE id = $1",
      [id]
    );

    if (currentDatPhong.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    const current = currentDatPhong.rows[0];

    // Cập nhật đặt phòng
    const datPhongResult = await client.query(
      `UPDATE dat_phong SET 
        khach_hang_id = $1, 
        phong_id = $2, 
        thoi_gian_vao = $3, 
        thoi_gian_du_kien_ra = $4,
        trang_thai = $5, 
        ghi_chu = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 RETURNING *`,
      [
        khach_hang_id || current.khach_hang_id,
        phong_id || current.phong_id,
        thoi_gian_vao || current.thoi_gian_vao,
        thoi_gian_du_kien_ra,
        trang_thai || current.trang_thai,
        ghi_chu || current.ghi_chu,
        id,
      ]
    );

    // Xử lý thay đổi trạng thái
    if (trang_thai && trang_thai !== current.trang_thai) {
      // Nếu trả phòng
      if (trang_thai === "đã trả") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [phong_id || current.phong_id]
        );
      }
      // Nếu nhận phòng
      else if (trang_thai === "đã nhận") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [phong_id || current.phong_id]
        );
      }
      // Nếu hủy đặt phòng
      else if (trang_thai === "đã hủy" && current.trang_thai === "đã nhận") {
        await client.query(
          "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [current.phong_id]
        );
      }
    }

    // Xử lý thay đổi phòng
    if (
      phong_id &&
      phong_id !== current.phong_id &&
      current.trang_thai === "đã nhận"
    ) {
      // Đổi trạng thái phòng cũ
      await client.query(
        "UPDATE phong SET trang_thai = 'đang dọn', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [current.phong_id]
      );

      // Đổi trạng thái phòng mới
      await client.query(
        "UPDATE phong SET trang_thai = 'đang sử dụng', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [phong_id]
      );
    }

    await client.query("COMMIT");

    res.status(200).json(datPhongResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating dat phong:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// Cập nhật hàm traPhong để lưu thông tin nhân viên
export const traPhong = async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get booking details with room and room type info
    const datPhongResult = await client.query(
      `SELECT dp.*, 
        p.id as phong_id, p.so_phong, p.so_tang,
        kh.ho_ten, kh.cmnd, kh.so_dien_thoai,
        lp.*
       FROM dat_phong dp 
       JOIN phong p ON dp.phong_id = p.id 
       JOIN khach_hang kh ON dp.khach_hang_id = kh.id
       JOIN loai_phong lp ON p.loai_phong_id = lp.id
       WHERE dp.id = $1`,
      [id]
    );

    if (datPhongResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Đặt phòng không tồn tại" });
    }

    const datPhong = datPhongResult.rows[0];

    // 2. Validate booking status
    if (datPhong.trang_thai !== "đã nhận") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Chỉ có thể trả phòng đang được sử dụng",
        current_status: datPhong.trang_thai,
      });
    }

    // 3. Get current time for checkout
    const thoiGianRa = new Date();

    // 4. Calculate room charges using our optimal pricing algorithm
    const thoiGianVao = new Date(datPhong.thoi_gian_vao);
    const ketQuaTinhTien = calculateOptimalRoomCharge(
      thoiGianVao,
      thoiGianRa,
      datPhong
    );
    const tongTienPhong = ketQuaTinhTien.tongTien;

    // 5. Calculate service charges
    const dichVuResult = await client.query(
      `SELECT sd.*, dv.ten_dich_vu
       FROM su_dung_dich_vu sd
       JOIN dich_vu dv ON sd.dich_vu_id = dv.id
       WHERE sd.dat_phong_id = $1
       ORDER BY sd.thoi_gian_su_dung`,
      [id]
    );

    const tongTienDichVu = dichVuResult.rows.reduce(
      (sum: number, item: any) => sum + item.gia_tien * item.so_luong,
      0
    );

    // Lấy ID nhân viên từ token
    const nhanVienId = (req as any).user?.id;

    // Get staff member's name
    let nhanVienHoTen = "Unknown";
    if (nhanVienId) {
      const nhanVienResult = await client.query(
        "SELECT ho_ten FROM nhan_vien WHERE id = $1",
        [nhanVienId]
      );
      if (nhanVienResult.rows.length > 0) {
        nhanVienHoTen = nhanVienResult.rows[0].ho_ten;
      }
    }

    // 6. Create invoice
    const hoaDonResult = await client.query(
      `INSERT INTO hoa_don (
        dat_phong_id,
        khach_hang_id,
        nhan_vien_id,
        thoi_gian_tra,
        tong_tien_phong,
        tong_tien_dich_vu,
        tong_tien,
        trang_thai_thanh_toan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        id,
        datPhong.khach_hang_id,
        nhanVienId, // Thêm ID nhân viên
        thoiGianRa,
        tongTienPhong,
        tongTienDichVu,
        tongTienPhong + tongTienDichVu,
        "chưa thanh toán",
      ]
    );

    // 7. Update booking and room status
    await client.query(
      `UPDATE dat_phong 
       SET trang_thai = 'đã trả',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    await client.query(
      `UPDATE phong 
       SET trang_thai = 'đang dọn',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [datPhong.phong_id]
    );

    await client.query("COMMIT");

    // 8. Prepare detailed response
    const response = {
      message: "Trả phòng thành công",
      hoa_don: {
        ...hoaDonResult.rows[0],
        thong_tin_khach: {
          ho_ten: datPhong.ho_ten,
          cmnd: datPhong.cmnd,
          so_dien_thoai: datPhong.so_dien_thoai,
        },
        thong_tin_phong: {
          so_phong: datPhong.so_phong,
          so_tang: datPhong.so_tang,
          loai_phong: datPhong.ten_loai_phong,
        },
        thong_tin_nhan_vien: {
          id: nhanVienId,
          ho_ten: nhanVienHoTen,
        },
        chi_tiet_thoi_gian: {
          check_in: thoiGianVao,
          check_out: thoiGianRa,
          so_gio: Math.ceil(
            (thoiGianRa.getTime() - thoiGianVao.getTime()) / (1000 * 60 * 60)
          ),
        },
        chi_tiet_tinh_tien: ketQuaTinhTien.chiTiet,
        chi_tiet_dich_vu: dichVuResult.rows.map((dv) => ({
          ten_dich_vu: dv.ten_dich_vu,
          so_luong: dv.so_luong,
          gia: dv.gia_tien,
          thanh_tien: dv.gia_tien * dv.so_luong,
          thoi_gian_su_dung: dv.thoi_gian_su_dung,
          ghi_chu: dv.ghi_chu,
        })),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing tra phong:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  } finally {
    client.release();
  }
};

export const getKhachDangO = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
        SELECT * FROM khach_dang_o ORDER BY so_tang, so_phong
      `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching khach dang o:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const tinhGiaTamThoi = async (req: Request, res: Response) => {
  const { dat_phong_id } = req.params;

  try {
    const datPhongResult = await pool.query(
      `
      SELECT dp.*, p.loai_phong_id, lp.*
      FROM dat_phong dp
      JOIN phong p ON dp.phong_id = p.id
      JOIN loai_phong lp ON p.loai_phong_id = lp.id
      WHERE dp.id = $1 AND dp.trang_thai = 'đã nhận'
    `,
      [dat_phong_id]
    );

    if (datPhongResult.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy thông tin đặt phòng hoặc phòng chưa được nhận",
      });
    }

    const datPhong = datPhongResult.rows[0];

    // Đảm bảo thời gian vào là UTC
    const thoiGianVao = new Date(datPhong.thoi_gian_vao);

    // Lấy thời gian hiện tại theo UTC
    const now = new Date();

    // Tính tiền phòng với thời gian UTC (sẽ được chuyển đổi sang giờ Việt Nam trong hàm)
    const tinhTienPhong = calculateOptimalRoomCharge(
      thoiGianVao,
      now,
      datPhong
    );

    // Tính tiền dịch vụ đã sử dụng
    const dichVuResult = await pool.query(
      `
      SELECT SUM(gia_tien * so_luong) as tong_tien_dich_vu
      FROM su_dung_dich_vu
      WHERE dat_phong_id = $1
    `,
      [dat_phong_id]
    );

    const tongTienDichVu = Number(dichVuResult.rows[0].tong_tien_dich_vu || 0);

    // Chi tiết dịch vụ đã sử dụng
    const chiTietDichVu = await pool.query(
      `
      SELECT sd.*, dv.ten_dich_vu
      FROM su_dung_dich_vu sd
      JOIN dich_vu dv ON sd.dich_vu_id = dv.id
      WHERE sd.dat_phong_id = $1
      ORDER BY sd.thoi_gian_su_dung
    `,
      [dat_phong_id]
    );

    // Format lại response để đảm bảo kiểu dữ liệu nhất quán
    const response = {
      thoi_gian_vao: thoiGianVao.toISOString(),
      thoi_gian_hien_tai: now.toISOString(),
      tien_phong: tinhTienPhong,
      tien_dich_vu: {
        tong_tien: tongTienDichVu,
        chi_tiet: chiTietDichVu.rows.map((item) => ({
          ...item,
          gia_tien: Number(item.gia_tien),
          so_luong: Number(item.so_luong),
        })),
      },
      tong_tien: Number(tinhTienPhong.tongTien) + Number(tongTienDichVu),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error calculating temporary price:", error);
    res.status(500).json({ message: "Server error" });
  }
};
