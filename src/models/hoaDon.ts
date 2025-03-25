export const calculateOptimalRoomCharge = (
  thoiGianVao: Date,
  thoiGianRa: Date,
  loaiPhong: any
): {
  tongTien: number;
  chiTiet: {
    loaiTinh: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
  }[];
} => {
  // Chuyển đổi thời gian từ UTC sang UTC+7
  const TIMEZONE_OFFSET = 7; // UTC+7

  const convertToLocalTime = (date: Date): Date => {
    const localDate = new Date(date);
    localDate.setUTCHours(date.getUTCHours() + TIMEZONE_OFFSET);
    return localDate;
  };

  // Chuyển đổi thời gian vào và ra sang giờ địa phương (UTC+7)
  const localThoiGianVao = convertToLocalTime(thoiGianVao);
  const localThoiGianRa = convertToLocalTime(thoiGianRa);

  // Tính số giờ sử dụng dựa trên thời gian địa phương
  const thoiGianSuDungGio =
    (localThoiGianRa.getTime() - localThoiGianVao.getTime()) / (60 * 60 * 1000);

  const chiTiet: {
    loaiTinh: string;
    soLuong: number;
    donGia: number;
    thanhTien: number;
  }[] = [];

  // Chuyển đổi giá từ string sang number
  const giaQuaDem = Number(loaiPhong.gia_qua_dem);
  const giaGioDau = Number(loaiPhong.gia_gio_dau);
  const giaTheoGio = Number(loaiPhong.gia_theo_gio);
  const giaQuaNgay = Number(loaiPhong.gia_qua_ngay);

  // Hàm kiểm tra và phân tích thời gian qua đêm sử dụng giờ địa phương
  const analyzeOvernight = (
    start: Date,
    end: Date
  ): {
    isOvernight: boolean;
    earlyHours: number;
    lateHours: number;
  } => {
    const startHour = start.getHours(); // Sử dụng getHours() thay vì getUTCHours()
    const endHour = end.getHours();
    const startDay = start.getDate(); // Sử dụng getDate() thay vì getUTCDate()
    const endDay = end.getDate();

    // Tính giờ sớm trước 20h
    const earlyHours = startHour < 20 ? 20 - startHour : 0;

    // Tính giờ trễ sau 11h
    const lateHours = endHour > 11 ? endHour - 11 : 0;

    // TH1: Vào trước hoặc vào 20h, ra trước hoặc vào 11h hôm sau
    if (startHour <= 20 && endDay === startDay + 1 && endHour <= 11) {
      return { isOvernight: true, earlyHours, lateHours };
    }

    // TH2: Vào sau 20h, ra trước hoặc vào 11h hôm sau
    if (startHour > 20 && endDay === startDay + 1 && endHour <= 11) {
      return { isOvernight: true, earlyHours: 0, lateHours };
    }

    // TH3: Vào từ 0h-4h, ra trước hoặc vào 11h cùng ngày
    if (
      startHour >= 0 &&
      startHour <= 4 &&
      endDay === startDay &&
      endHour <= 11
    ) {
      return { isOvernight: true, earlyHours: 0, lateHours };
    }

    return { isOvernight: false, earlyHours: 0, lateHours: 0 };
  };

  // Tính số ngày và số giờ dư
  const soDem = Math.floor(thoiGianSuDungGio / 24);
  const soGioDu = thoiGianSuDungGio % 24;

  // Tính toán phương án 1: Theo qua đêm + giờ phụ trội
  const tinhTheoQuaDem = () => {
    const analysis = analyzeOvernight(localThoiGianVao, localThoiGianRa);
    if (!analysis.isOvernight)
      return { tongTien: Number.POSITIVE_INFINITY, chiTiet: [] };

    let tongTien = 0;
    const chiTietQuaDem = [];

    // Tính tiền qua đêm
    chiTietQuaDem.push({
      loaiTinh: "Qua đêm",
      soLuong: 1,
      donGia: giaQuaDem,
      thanhTien: giaQuaDem,
    });
    tongTien += giaQuaDem;

    // Tính giờ phụ trội trước 20h
    if (analysis.earlyHours > 0) {
      chiTietQuaDem.push({
        loaiTinh: "Giờ phụ trội trước",
        soLuong: analysis.earlyHours,
        donGia: giaTheoGio,
        thanhTien: analysis.earlyHours * giaTheoGio,
      });
      tongTien += analysis.earlyHours * giaTheoGio;
    }

    // Tính giờ phụ trội sau 11h
    if (analysis.lateHours > 0) {
      chiTietQuaDem.push({
        loaiTinh: "Giờ phụ trội sau",
        soLuong: analysis.lateHours,
        donGia: giaTheoGio,
        thanhTien: analysis.lateHours * giaTheoGio,
      });
      tongTien += analysis.lateHours * giaTheoGio;
    }

    return { tongTien, chiTiet: chiTietQuaDem };
  };

  // Tính toán phương án 2: Theo giờ thông thường
  const tinhTheoGio = () => {
    let tongTien = 0;
    const chiTietTheoGio = [];

    // Giờ đầu
    chiTietTheoGio.push({
      loaiTinh: "Giờ đầu",
      soLuong: 1,
      donGia: giaGioDau,
      thanhTien: giaGioDau,
    });
    tongTien += giaGioDau;

    // Các giờ sau
    if (thoiGianSuDungGio > 1) {
      const soGioSau = Math.ceil(thoiGianSuDungGio - 1);
      chiTietTheoGio.push({
        loaiTinh: "Giờ sau",
        soLuong: soGioSau,
        donGia: giaTheoGio,
        thanhTien: soGioSau * giaTheoGio,
      });
      tongTien += soGioSau * giaTheoGio;
    }

    return { tongTien, chiTiet: chiTietTheoGio };
  };

  // Tính toán phương án 3: Theo ngày + giờ phụ trội
  const tinhTheoNgay = () => {
    let tongTien = 0;
    const chiTietTheoNgay = [];

    if (soDem > 0) {
      chiTietTheoNgay.push({
        loaiTinh: "Ngày",
        soLuong: soDem,
        donGia: giaQuaNgay,
        thanhTien: soDem * giaQuaNgay,
      });
      tongTien += soDem * giaQuaNgay;
    }

    if (soGioDu > 0) {
      chiTietTheoNgay.push({
        loaiTinh: "Giờ sau",
        soLuong: Math.ceil(soGioDu),
        donGia: giaTheoGio,
        thanhTien: Math.ceil(soGioDu) * giaTheoGio,
      });
      tongTien += Math.ceil(soGioDu) * giaTheoGio;
    }

    return { tongTien, chiTiet: chiTietTheoNgay };
  };

  // Tính toán tất cả phương án và chọn phương án có lợi nhất cho khách
  const ketQuaQuaDem = tinhTheoQuaDem();
  const ketQuaTheoGio = tinhTheoGio();
  const ketQuaTheoNgay =
    thoiGianSuDungGio >= 24
      ? tinhTheoNgay()
      : { tongTien: Number.POSITIVE_INFINITY, chiTiet: [] };

  // Chọn phương án có giá thấp nhất
  const cacPhuongAn = [ketQuaQuaDem, ketQuaTheoGio, ketQuaTheoNgay];
  const phuongAnToiUu = cacPhuongAn.reduce((min, current) =>
    current.tongTien < min.tongTien ? current : min
  );

  return {
    tongTien: phuongAnToiUu.tongTien,
    chiTiet: phuongAnToiUu.chiTiet,
  };
};
