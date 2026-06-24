# 🅿️ UTT Smart Parking System 🚗✨

Xin chào những bông hoa nhỏ ham học 🌷📚
Chào mừng mọi người đến với dự án của **Nhóm 7: Kỹ năng có hạn** 😎🚀

---

## 🌟 Giới thiệu dự án

**UTT Smart Parking System** là dự án xây dựng website quản lý bãi xe dành cho **sinh viên** và **bộ phận quản trị** trong trường học. 🏫🛵

Dự án tập trung vào một vấn đề thực tế: hoạt động gửi xe trong trường thường có nhiều dữ liệu cần quản lý như **thông tin sinh viên**, **phương tiện**, **khu gửi xe**, **ô gửi xe**, **phí gửi xe** và **lịch sử ra vào bãi**. 📋🔍

---

## 🧑‍🎓 Chức năng dành cho sinh viên

Trong phiên bản hiện tại, hệ thống cho phép sinh viên:

* 🔐 Đăng nhập vào hệ thống
* 🏍️ Quản lý xe cá nhân
* 💳 Nạp tiền vào ví
* 🅿️ Gửi xe
* 🚪 Lấy xe
* 📜 Xem lịch sử giao dịch

---

## 🧑‍💼 Chức năng dành cho admin

Ở phía quản trị, admin có thể:

* 📊 Theo dõi tổng quan bãi xe
* 🟢 Xem số ô trống
* 🏍️ Xem số xe đang gửi
* 📋 Xem danh sách xe trong bãi
* 👤 Kiểm tra thông tin sinh viên sở hữu xe
* 📍 Theo dõi vị trí xe đang được gửi

---

## 🛠️ Công nghệ sử dụng

Dự án được triển khai theo mô hình website gồm **frontend**, **backend** và **database**. 🌐

* 🎨 **Frontend:** HTML, CSS, JavaScript
* ⚙️ **Backend:** Flask
* 🗄️ **Database:** SQLite

Frontend sử dụng **HTML, CSS, JavaScript** để xây dựng giao diện.
Backend sử dụng **Flask** để xử lý API.
Database sử dụng **SQLite** để lưu thông tin người dùng, xe sinh viên, khu gửi xe, ô gửi xe và lịch sử giao dịch. 🧩

---

## 🔄 Luồng hoạt động chính

Điểm quan trọng của dự án là các chức năng được kết nối thành một luồng thống nhất. 🔗

Khi sinh viên gửi xe, hệ thống sẽ:

1. ✅ Kiểm tra xe đã khai báo
2. 📍 Cho phép chọn khu gửi xe phù hợp
3. 💰 Tự động trừ phí trong ví
4. 🅿️ Cập nhật trạng thái ô gửi xe
5. 📝 Ghi nhận lịch sử giao dịch

Dữ liệu này đồng thời được hiển thị ở trang admin, giúp người quản lý theo dõi tình trạng bãi xe một cách trực quan hơn. 📊👀

---

## 💖 Lời nhắn từ nhóm

Dự án được thực hiện bởi **Nhóm 7: Kỹ năng có hạn** với tinh thần học hỏi, cố gắng và mong muốn tạo ra một sản phẩm có ích cho môi trường học đường. 🌱✨

Cảm ơn mọi người đã ghé thăm dự án của chúng mình! 🚀🌷

