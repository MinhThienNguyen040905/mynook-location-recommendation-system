# MyNook — Mission

> Tài liệu định hướng sản phẩm. Mọi spec phải phục vụ ít nhất một mục tiêu ở đây; tính năng không phục vụ mục tiêu nào → xem lại có nên làm không.

## 1. Sứ mệnh

**Giúp người dùng tìm được "góc quen" phù hợp với đúng nhu cầu của họ ở thời điểm đó** — một quán cà phê yên tĩnh để làm việc buổi tối, một quán lẩu cho nhóm 6 người gần đây, một chỗ có view đẹp để hẹn hò — bằng cách nói/gõ tự nhiên bằng tiếng Việt, thay vì lọc qua hàng chục bộ lọc cứng.

## 2. Vấn đề

| Vấn đề | Hệ quả |
|---|---|
| Các nền tảng hiện có tìm theo tên/danh mục, không hiểu câu như *"quán yên tĩnh có ổ cắm cho 4 người buổi tối"* | Người dùng phải lướt nhiều kết quả, đọc review thủ công |
| Rating trung bình không cho biết quán **phù hợp với ngữ cảnh nào** (ồn buổi tối nhưng yên buổi sáng) | Đi đến nơi không đúng kỳ vọng |
| Quán nhỏ, quán mới ít dữ liệu nên khó được phát hiện | Cold-start cho cả quán lẫn người dùng mới |
| Chủ quán thiếu kênh đơn giản để cập nhật menu, thông tin, độ đông | Thông tin lỗi thời |

## 3. Người dùng mục tiêu

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| **Người khám phá** (customer) | 18–35 tuổi, sống ở thành phố lớn (HCM, HN, ĐN), hay đi cà phê/ăn uống/làm việc ngoài | Tìm nhanh chỗ hợp ngữ cảnh, xem review thật, lưu chỗ yêu thích |
| **Người đóng góp** (customer tích cực) | Thích viết review, thêm quán mới | Được ghi nhận, review hữu ích được tương tác |
| **Chủ quán** (owner) | Quán nhỏ/vừa, không có đội marketing | Quản lý thông tin, menu, xem phản hồi khách |
| **Quản trị viên** (admin) | Vận hành nền tảng | Kiểm duyệt nội dung, quản lý dữ liệu nền (danh mục, địa lý), import dữ liệu |

## 4. Giá trị cốt lõi

1. **Tìm kiếm hiểu ngôn ngữ tự nhiên** — kết hợp AI trích xuất ý định + tìm kiếm ngữ nghĩa + khoảng cách + tag cộng đồng.
2. **Tag theo ngữ cảnh từ review** — review được AI phân tích thành tag (yên tĩnh, view đẹp...) gắn với khung giờ, làm giàu dữ liệu tìm kiếm theo thời gian.
3. **Gợi ý cá nhân hoá tức thì** — mỗi lần yêu thích/đánh giá cao thay đổi gợi ý ngay.
4. **Dữ liệu cộng đồng** — người dùng đóng góp quán, review, bình luận; admin kiểm duyệt.
5. **Không bao giờ "0 kết quả"** — hệ thống tự nới lỏng điều kiện và vẫn chạy khi AI lỗi.

## 5. Mục tiêu đo lường (đề xuất)

| Mục tiêu | Chỉ số | Ngưỡng |
|---|---|---|
| Tìm kiếm phù hợp | % lượt search có click vào kết quả top 5 | ≥ 60% |
| Tìm kiếm nhanh | p95 thời gian phản hồi `/search` | ≤ 1.5s |
| Gợi ý có ích | % người dùng có tín hiệu nhận được ≥ 5 gợi ý | ≥ 90% |
| Dữ liệu sống | % review mới được AI gắn tag trong 1 phút | ≥ 95% |
| Nội dung sạch | Thời gian xử lý báo cáo vi phạm trung bình | ≤ 24h |

*Các ngưỡng là đề xuất ban đầu — chỉnh lại khi có dữ liệu thật.*

## 6. Phạm vi

**Trong phạm vi:** khám phá & tìm kiếm địa điểm ăn uống/cà phê/làm việc tại Việt Nam, review & tương tác cộng đồng, gợi ý cá nhân, công cụ cho chủ quán và admin.

**Ngoài phạm vi (hiện tại):** thanh toán online, giao hàng, ứng dụng mobile native, đa ngôn ngữ ngoài tiếng Việt.

## 7. Nguyên tắc sản phẩm

- **Tiếng Việt trước tiên** — hiểu viết tắt, không dấu, tiếng lóng địa phương ("q1", "cf", "lẩu nướng").
- **AI hỗ trợ, không quyết định thay** — AI gợi ý tag/danh mục, dữ liệu cuối cùng do DB và con người kiểm soát.
- **Tin cậy hơn số lượng** — review xác thực đã ghé quán có trọng số cao hơn; nội dung vi phạm bị xử lý.
- **Đơn giản cho chủ quán** — cập nhật menu bằng cách chụp ảnh, không cần nhập tay từng món.
