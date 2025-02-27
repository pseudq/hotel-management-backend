export interface LoaiPhong {
  id: number;
  ten_loai_phong: string;
  gia_qua_dem: number;
  gia_gio_dau: number;
  gia_theo_gio: number;
  gia_qua_ngay: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Phong {
  id: number;
  so_phong: string;
  so_tang: number;
  loai_phong_id: number;
  trang_thai: "trống" | "đang sử dụng" | "đang dọn" | "bảo trì";
  created_at?: Date;
  updated_at?: Date;
}

export interface KhachHang {
  id: number;
  ho_ten: string;
  cmnd: string;
  so_dien_thoai?: string;
  email?: string;
  dia_chi?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DatPhong {
  id: number;
  khach_hang_id: number;
  phong_id: number;
  thoi_gian_vao: Date;
  thoi_gian_du_kien_ra?: Date;
  loai_dat: "giờ" | "ngày" | "đêm";
  trang_thai: "đã đặt" | "đã nhận" | "đã trả" | "đã hủy";
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DichVu {
  id: number;
  ten_dich_vu: string;
  gia: number;
  mo_ta?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SuDungDichVu {
  id: number;
  dat_phong_id: number;
  dich_vu_id: number;
  so_luong: number;
  gia_tien: number;
  thoi_gian_su_dung: Date;
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface HoaDon {
  id: number;
  dat_phong_id: number;
  khach_hang_id: number;
  thoi_gian_tra: Date;
  tong_tien_phong: number;
  tong_tien_dich_vu: number;
  tong_tien: number;
  phuong_thuc_thanh_toan?: string;
  trang_thai_thanh_toan:
    | "chưa thanh toán"
    | "đã thanh toán"
    | "thanh toán một phần";
  ghi_chu?: string;
  created_at?: Date;
  updated_at?: Date;
}
