// Helper function to convert UTC time to Vietnam time (UTC+7)
function convertToVietnamTime(utcDate: Date): Date {
  const vietnamTime = new Date(utcDate);
  vietnamTime.setHours(vietnamTime.getHours() + 7);
  return vietnamTime;
}

// Helper function to round hours based on minutes
function getHours(durationMinutes: number, minOne = false): number {
  const wholeHours = Math.floor(durationMinutes / 60);
  const remainder = durationMinutes % 60;
  // Làm tròn lên nếu phút > 5, ngược lại giữ nguyên
  let hours = wholeHours + (remainder > 5 ? 1 : 0);
  if (minOne && hours === 0) {
    hours = 1;
  }
  return hours;
}

// Tính số giờ giữa hai thời điểm, làm tròn theo quy tắc
function calculateHours(start: Date, end: Date): number {
  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  return getHours(durationMinutes, true);
}

// Tính số ngày giữa hai thời điểm
function calculateDays(start: Date, end: Date): number {
  const durationHours = (end.getTime() - start.getTime()) / (3600 * 1000);
  return Math.ceil(durationHours / 24);
}

// Tính giá theo giờ
function calculateHourlyPrice(
  start: Date,
  end: Date,
  giaGioDau: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const hours = calculateHours(start, end);
  const chiTiet = [];

  // Giờ đầu tiên
  chiTiet.push({
    loaiTinh: "Giờ đầu",
    soLuong: 1,
    donGia: giaGioDau,
    thanhTien: giaGioDau,
  });

  // Các giờ tiếp theo
  if (hours > 1) {
    chiTiet.push({
      loaiTinh: "Giờ sau",
      soLuong: hours - 1,
      donGia: giaGioSau,
      thanhTien: (hours - 1) * giaGioSau,
    });
  }

  const tongTien = giaGioDau + (hours - 1) * giaGioSau;

  return { tongTien, chiTiet };
}

// Tính giá qua đêm (19:00 - 11:00 hôm sau)
function calculateOvernightPrice(
  start: Date,
  end: Date,
  giaQuaDem: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const chiTiet = [];
  let tongTien = 0;

  // Tạo bản sao để không ảnh hưởng đến tham số gốc
  const checkIn = new Date(start);
  const checkOut = new Date(end);

  // Tính số đêm
  let soDem = 0;
  let currentNight = new Date(checkIn);

  // Điều chỉnh thời gian bắt đầu đêm đầu tiên
  const firstNightStart = new Date(currentNight);
  firstNightStart.setHours(19, 0, 0, 0);

  // Nếu check-in sau 19:00, sử dụng thời gian check-in
  // Nếu check-in trước 19:00, sử dụng 19:00
  if (checkIn > firstNightStart) {
    currentNight = new Date(checkIn);
  } else {
    currentNight = new Date(firstNightStart);
  }

  while (currentNight < checkOut) {
    // Thời gian kết thúc đêm hiện tại là 11:00 sáng hôm sau
    const nightEnd = new Date(currentNight);
    nightEnd.setDate(nightEnd.getDate() + 1);
    nightEnd.setHours(11, 0, 0, 0);

    // Nếu checkout trước kết thúc đêm, đây là đêm cuối cùng
    if (checkOut <= nightEnd) {
      soDem++;
      break;
    }

    // Tăng số đêm và chuyển sang đêm tiếp theo
    soDem++;
    currentNight = new Date(nightEnd);

    // Đêm tiếp theo bắt đầu lúc 19:00
    currentNight.setHours(19, 0, 0, 0);

    // Nếu có khoảng trống giữa 11:00 và 19:00, sẽ tính riêng sau
  }

  // Thêm chi tiết số đêm
  if (soDem > 0) {
    chiTiet.push({
      loaiTinh: "Qua đêm",
      soLuong: soDem,
      donGia: giaQuaDem,
      thanhTien: soDem * giaQuaDem,
    });
    tongTien += soDem * giaQuaDem;
  }

  // Tính phụ thu đến sớm (trước 19:00)
  if (checkIn.getHours() < 19) {
    const earlyStart = new Date(checkIn);
    const earlyEnd = new Date(checkIn);
    earlyEnd.setHours(19, 0, 0, 0);

    // Nếu check-in cùng ngày và trước 19:00
    if (earlyStart < earlyEnd) {
      const earlyHours = calculateHours(earlyStart, earlyEnd);
      if (earlyHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu đến sớm",
          soLuong: earlyHours,
          donGia: giaGioSau,
          thanhTien: earlyHours * giaGioSau,
        });
        tongTien += earlyHours * giaGioSau;
      }
    }
  }

  // Tính phụ thu trả muộn (sau 11:00)
  if (
    checkOut.getHours() > 11 ||
    (checkOut.getHours() === 11 && checkOut.getMinutes() > 0)
  ) {
    const lateStart = new Date(checkOut);
    lateStart.setHours(11, 0, 0, 0);
    const lateEnd = new Date(checkOut);

    // Nếu checkout cùng ngày và sau 11:00
    if (lateStart < lateEnd) {
      const lateHours = calculateHours(lateStart, lateEnd);
      if (lateHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu trả muộn",
          soLuong: lateHours,
          donGia: giaGioSau,
          thanhTien: lateHours * giaGioSau,
        });
        tongTien += lateHours * giaGioSau;
      }
    }
  }

  // Tính phụ thu cho khoảng thời gian giữa các đêm (11:00 - 19:00)
  if (soDem > 1) {
    const currentDay = new Date(checkIn);
    currentDay.setDate(currentDay.getDate() + 1);
    currentDay.setHours(11, 0, 0, 0);

    for (let i = 0; i < soDem - 1; i++) {
      const dayStart = new Date(currentDay);
      const dayEnd = new Date(currentDay);
      dayEnd.setHours(19, 0, 0, 0);

      if (dayStart < dayEnd) {
        const dayHours = calculateHours(dayStart, dayEnd);
        if (dayHours > 0) {
          chiTiet.push({
            loaiTinh: "Phụ thu giữa các đêm",
            soLuong: dayHours,
            donGia: giaGioSau,
            thanhTien: dayHours * giaGioSau,
          });
          tongTien += dayHours * giaGioSau;
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  return { tongTien, chiTiet };
}

// Tính giá theo ngày (12:00 - 12:00 hôm sau)
function calculateDailyPrice(
  start: Date,
  end: Date,
  giaTheoNgay: number,
  giaGioSau: number
): { tongTien: number; chiTiet: any[] } {
  const chiTiet = [];
  let tongTien = 0;

  // Tạo bản sao để không ảnh hưởng đến tham số gốc
  const checkIn = new Date(start);
  const checkOut = new Date(end);

  // Tính số ngày
  let soNgay = 0;
  let currentDay = new Date(checkIn);

  // Điều chỉnh thời gian bắt đầu ngày đầu tiên
  const firstDayStart = new Date(currentDay);
  firstDayStart.setHours(12, 0, 0, 0);

  // Nếu check-in sau 12:00, sử dụng thời gian check-in
  // Nếu check-in trước 12:00, sử dụng 12:00
  if (checkIn > firstDayStart) {
    currentDay = new Date(checkIn);
  } else {
    currentDay = new Date(firstDayStart);
  }

  while (currentDay < checkOut) {
    // Thời gian kết thúc ngày hiện tại là 12:00 trưa hôm sau
    const dayEnd = new Date(currentDay);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(12, 0, 0, 0);

    // Nếu checkout trước kết thúc ngày, đây là ngày cuối cùng
    if (checkOut <= dayEnd) {
      soNgay++;
      break;
    }

    // Tăng số ngày và chuyển sang ngày tiếp theo
    soNgay++;
    currentDay = new Date(dayEnd);
  }

  // Thêm chi tiết số ngày
  if (soNgay > 0) {
    chiTiet.push({
      loaiTinh: "Theo ngày",
      soLuong: soNgay,
      donGia: giaTheoNgay,
      thanhTien: soNgay * giaTheoNgay,
    });
    tongTien += soNgay * giaTheoNgay;
  }

  // Tính phụ thu đến sớm (trước 12:00)
  if (checkIn.getHours() < 12) {
    const earlyStart = new Date(checkIn);
    const earlyEnd = new Date(checkIn);
    earlyEnd.setHours(12, 0, 0, 0);

    // Nếu check-in cùng ngày và trước 12:00
    if (earlyStart < earlyEnd) {
      const earlyHours = calculateHours(earlyStart, earlyEnd);
      if (earlyHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu đến sớm",
          soLuong: earlyHours,
          donGia: giaGioSau,
          thanhTien: earlyHours * giaGioSau,
        });
        tongTien += earlyHours * giaGioSau;
      }
    }
  }

  // Tính phụ thu trả muộn (sau 12:00)
  if (
    checkOut.getHours() > 12 ||
    (checkOut.getHours() === 12 && checkOut.getMinutes() > 0)
  ) {
    const lateStart = new Date(checkOut);
    lateStart.setHours(12, 0, 0, 0);
    const lateEnd = new Date(checkOut);

    // Nếu checkout cùng ngày và sau 12:00
    if (lateStart < lateEnd) {
      const lateHours = calculateHours(lateStart, lateEnd);
      if (lateHours > 0) {
        chiTiet.push({
          loaiTinh: "Phụ thu trả muộn",
          soLuong: lateHours,
          donGia: giaGioSau,
          thanhTien: lateHours * giaGioSau,
        });
        tongTien += lateHours * giaGioSau;
      }
    }
  }

  return { tongTien, chiTiet };
}

// Hàm chính để tính giá tối ưu
export function calculateOptimalPrice(
  checkin: Date,
  checkout: Date,
  giaQuaDem = 150000,
  giaTheoNgay = 250000,
  giaGioDau = 50000,
  giaGioSau = 20000
): number {
  // Chuyển đổi thời gian từ UTC sang giờ Việt Nam
  const vietnamCheckin = convertToVietnamTime(checkin);
  const vietnamCheckout = convertToVietnamTime(checkout);
  // Tính giá theo từng phương thức
  const hourlyPrice = calculateHourlyPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaGioDau,
    giaGioSau
  ).tongTien;
  const overnightPrice = calculateOvernightPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaQuaDem,
    giaGioSau
  ).tongTien;
  const dailyPrice = calculateDailyPrice(
    vietnamCheckin,
    vietnamCheckout,
    giaTheoNgay,
    giaGioSau
  ).tongTien;

  // Trả về giá thấp nhất
  return Math.min(hourlyPrice, overnightPrice, dailyPrice);
}

// Hàm chính để tính giá tối ưu và trả về chi tiết
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
  // Chuyển đổi thời gian từ UTC sang giờ Việt Nam
  const vietnamThoiGianVao = convertToVietnamTime(thoiGianVao);
  const vietnamThoiGianRa = convertToVietnamTime(thoiGianRa);

  // Log để debug
  console.log(
    `UTC Check-in: ${thoiGianVao.toISOString()}, Vietnam Check-in: ${vietnamThoiGianVao.toISOString()}`
  );
  console.log(
    `UTC Check-out: ${thoiGianRa.toISOString()}, Vietnam Check-out: ${vietnamThoiGianRa.toISOString()}`
  );
  // Lấy giá từ loại phòng
  const giaQuaDem = Number(loaiPhong.gia_qua_dem) || 150000;
  const giaTheoNgay = Number(loaiPhong.gia_qua_ngay) || 250000;
  const giaGioDau = Number(loaiPhong.gia_gio_dau) || 50000;
  const giaGioSau = Number(loaiPhong.gia_theo_gio) || 20000;
  // Tính tổng số phút ở lại
  const durationMinutes =
    (thoiGianRa.getTime() - thoiGianVao.getTime()) / (60 * 1000);

  // Nếu dưới 5 tiếng thì luôn tính theo giờ
  if (durationMinutes < 300) {
    return calculateHourlyPrice(thoiGianVao, thoiGianRa, giaGioDau, giaGioSau);
  }
  // Tính giá theo từng phương thức
  const hourlyResult = calculateHourlyPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaGioDau,
    giaGioSau
  );
  const overnightResult = calculateOvernightPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaQuaDem,
    giaGioSau
  );
  const dailyResult = calculateDailyPrice(
    vietnamThoiGianVao,
    vietnamThoiGianRa,
    giaTheoNgay,
    giaGioSau
  );

  // Log để debug
  console.log(`Hourly price: ${hourlyResult.tongTien}`);
  console.log(`Overnight price: ${overnightResult.tongTien}`);
  console.log(`Daily price: ${dailyResult.tongTien}`);

  // So sánh để tìm phương án rẻ nhất
  let bestResult = hourlyResult;
  if (overnightResult.tongTien < bestResult.tongTien) {
    bestResult = overnightResult;
  }
  if (dailyResult.tongTien < bestResult.tongTien) {
    bestResult = dailyResult;
  }
  // Thêm thông tin về múi giờ vào chi tiết
  bestResult.chiTiet.unshift({
    loaiTinh: "Thông tin thời gian",
    soLuong: 0,
    donGia: 0,
    thanhTien: 0,
    ghiChu: `Check-in: ${vietnamThoiGianVao.toLocaleString(
      "vi-VN"
    )} - Check-out: ${vietnamThoiGianRa.toLocaleString(
      "vi-VN"
    )} (Giờ Việt Nam)`,
  });

  return bestResult;
};
