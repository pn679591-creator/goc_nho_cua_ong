// Bộ bài Tarot mặc định (22 lá Ẩn chính) dùng khi registry Firestore
// "tarotDeck" chưa có dữ liệu. Chủ nhà có thể thêm bài Ẩn phụ hoặc sửa nội
// dung qua Owner Console → Tarot Master mà không cần sửa file này.
export const DEFAULT_TAROT_DECK = [
  { id: '0-ke-ngoc', name: 'Kẻ Ngốc', image: 'tarot/0-ke-ngoc.svg', upright: 'Khởi đầu mới, tự do, dám bước đi dù chưa biết trước con đường.', reversed: 'Bốc đồng, thiếu chuẩn bị, cần cẩn trọng hơn trước khi hành động.' },
  { id: '1-ao-thuat-gia', name: 'Ảo Thuật Gia', image: 'tarot/1-ao-thuat-gia.svg', upright: 'Bạn có đủ công cụ để biến ý tưởng thành hiện thực, hãy tự tin hành động.', reversed: 'Thiếu tập trung hoặc dùng sai khả năng của mình, hãy xem lại mục tiêu.' },
  { id: '2-nu-tu-si', name: 'Nữ Tư Tế', image: 'tarot/2-nu-tu-si.svg', upright: 'Lắng nghe trực giác, câu trả lời đang ở bên trong bạn.', reversed: 'Đang phớt lờ cảm nhận thật của bản thân, hãy chậm lại và lắng nghe.' },
  { id: '3-nu-hoang', name: 'Nữ Hoàng', image: 'tarot/3-nu-hoang.svg', upright: 'Sự sung túc, chăm sóc bản thân và những người xung quanh.', reversed: 'Quá tải vì chăm lo cho người khác mà quên chính mình.' },
  { id: '4-hoang-de', name: 'Hoàng Đế', image: 'tarot/4-hoang-de.svg', upright: 'Kỷ luật và cấu trúc rõ ràng sẽ giúp bạn đạt được mục tiêu.', reversed: 'Quá cứng nhắc hoặc mất kiểm soát tình hình, cần linh hoạt hơn.' },
  { id: '5-giao-hoang', name: 'Giáo Hoàng', image: 'tarot/5-giao-hoang.svg', upright: 'Học hỏi từ người đi trước, giá trị truyền thống mang lại sự vững vàng.', reversed: 'Cứng nhắc theo lối cũ, đã đến lúc thử điều gì đó khác biệt.' },
  { id: '6-tinh-nhan', name: 'Tình Nhân', image: 'tarot/6-tinh-nhan.svg', upright: 'Một lựa chọn quan trọng về tình cảm hoặc giá trị sống đang chờ bạn.', reversed: 'Mất cân bằng trong mối quan hệ, cần nhìn lại điều bạn thật sự muốn.' },
  { id: '7-cai-xe', name: 'Cỗ Xe', image: 'tarot/7-cai-xe.svg', upright: 'Ý chí mạnh mẽ giúp bạn tiến về phía trước và chiến thắng thử thách.', reversed: 'Mất phương hướng, cần xác định lại mục tiêu trước khi tiếp tục.' },
  { id: '8-suc-manh', name: 'Sức Mạnh', image: 'tarot/8-suc-manh.svg', upright: 'Lòng can đảm và sự dịu dàng cùng lúc sẽ giúp bạn vượt qua khó khăn.', reversed: 'Đang nghi ngờ bản thân, hãy tin vào nội lực của chính mình.' },
  { id: '9-an-si', name: 'Ẩn Sĩ', image: 'tarot/9-an-si.svg', upright: 'Đôi khi cần một mình để tìm lại sự sáng suốt bên trong.', reversed: 'Cô lập bản thân quá mức, hãy mở lòng kết nối trở lại.' },
  { id: '10-banh-xe', name: 'Bánh Xe Vận Mệnh', image: 'tarot/10-banh-xe.svg', upright: 'Một bước ngoặt tốt đẹp đang đến, hãy đón nhận sự thay đổi.', reversed: 'Giai đoạn khó khăn tạm thời, mọi thứ rồi sẽ xoay chuyển.' },
  { id: '11-cong-ly', name: 'Công Lý', image: 'tarot/11-cong-ly.svg', upright: 'Sự công bằng và trung thực sẽ mang lại kết quả xứng đáng.', reversed: 'Có điều gì đó chưa công bằng, cần nhìn nhận lại mọi việc khách quan hơn.' },
  { id: '12-nguoi-treo', name: 'Người Treo Ngược', image: 'tarot/12-nguoi-treo.svg', upright: 'Nhìn sự việc từ góc độ khác sẽ giúp bạn hiểu ra điều mới mẻ.', reversed: 'Đang trì hoãn không cần thiết, đã đến lúc hành động.' },
  { id: '13-cai-chet', name: 'Sự Biến Đổi', image: 'tarot/13-cai-chet.svg', upright: 'Một chương cũ khép lại để nhường chỗ cho khởi đầu tốt đẹp hơn.', reversed: 'Sợ thay đổi khiến bạn mắc kẹt, hãy can đảm buông bỏ.' },
  { id: '14-tiet-do', name: 'Tiết Độ', image: 'tarot/14-tiet-do.svg', upright: 'Sự cân bằng và kiên nhẫn sẽ mang lại hòa hợp trong cuộc sống.', reversed: 'Mất cân bằng, làm việc quá sức hoặc quá thái quá ở điều gì đó.' },
  { id: '15-quy-du', name: 'Ràng Buộc', image: 'tarot/15-quy-du.svg', upright: 'Có điều gì đó đang trói buộc bạn, hãy nhận diện để giải phóng bản thân.', reversed: 'Bạn đang dần thoát khỏi những giới hạn tự đặt ra cho mình.' },
  { id: '16-thap-do', name: 'Tháp Đổ', image: 'tarot/16-thap-do.svg', upright: 'Một thay đổi bất ngờ sẽ phá vỡ điều cũ để xây nền tảng vững chắc hơn.', reversed: 'Bạn đang né tránh một sự thật cần đối mặt.' },
  { id: '17-ngoi-sao', name: 'Ngôi Sao', image: 'tarot/17-ngoi-sao.svg', upright: 'Hy vọng và niềm tin đang dẫn lối cho bạn, hãy tiếp tục cố gắng.', reversed: 'Cảm thấy mất phương hướng, hãy tìm lại nguồn cảm hứng của mình.' },
  { id: '18-mat-trang', name: 'Mặt Trăng', image: 'tarot/18-mat-trang.svg', upright: 'Trực giác đang mách bảo điều gì đó, hãy tin vào cảm nhận của mình.', reversed: 'Nỗi lo lắng đang che mờ sự thật, hãy bình tĩnh nhìn nhận lại.' },
  { id: '19-mat-troi', name: 'Mặt Trời', image: 'tarot/19-mat-troi.svg', upright: 'Niềm vui, thành công và năng lượng tích cực đang chờ đón bạn.', reversed: 'Niềm vui bị trì hoãn, hãy kiên nhẫn một chút nữa thôi.' },
  { id: '20-phan-xet', name: 'Phán Xét', image: 'tarot/20-phan-xet.svg', upright: 'Đã đến lúc nhìn lại bản thân và đón nhận một sự thức tỉnh mới.', reversed: 'Đang tự phán xét bản thân quá khắt khe, hãy nhẹ nhàng hơn với chính mình.' },
  { id: '21-the-gioi', name: 'Thế Giới', image: 'tarot/21-the-gioi.svg', upright: 'Một hành trình đã hoàn thành trọn vẹn, hãy tự hào về chặng đường đã qua.', reversed: 'Còn vài bước nữa mới thật sự hoàn tất, đừng bỏ cuộc giữa chừng.' },
];

export const TAROT_CARD_BACK = 'tarot/card-back.svg';
