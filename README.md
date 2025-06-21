
Yêu cầu

Node.js: Phiên bản 16.x hoặc cao hơn.
MongoDB: Local (MongoDB Compass).
Git: Để clone repository.
Gemini API Key: Đăng ký tại Google Cloud Console.

Hướng dẫn chạy dự án
1. Clone repository
git clone https://github.com/<username>/StudentHub.git
cd StudentHub

2. Cài đặt dependencies

Frontend:cd frontend
npm install


Backend:cd ../backend
npm install



3. Cấu hình môi trường

Tạo file backend/.env với nội dung:MONGODB_URI=mongodb://localhost:27017/student_management
JWT_SECRET=mysecretkey123
PORT=5000
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=<your_gemini_api_key>


Thay <your_gemini_api_key> bằng key từ Google Cloud Console.
Đảm bảo MongoDB đang chạy (local hoặc Atlas).



4. Chạy ứng dụng

Backend:cd backend
npm start


Server chạy tại http://localhost:5000.


Frontend:cd frontend
npm run dev


Ứng dụng chạy tại http://localhost:5173.



5. Đăng nhập

Sử dụng tài khoản:
Admin: admin@domain.com (mật khẩu: admin123).
Giảng viên: lecturer001@domain.com (mật khẩu: lecturer123)


Truy cập /chatbot để sử dụng chatbot.

Hướng dẫn import dữ liệu vào MongoDB
Phương pháp 1: Dùng MongoDB Compass

Mở MongoDB Compass, kết nối đến database student_management.
Tạo các collection: students, courses, classes, grades, users.
Import từng file JSON trong thư mục data/:
Nhấn Import Data trong Compass.
Chọn file (student_management.classes.json, student_management.courses.json, v.v.).
Chọn collection tương ứng (ví dụ: student_management.classes.json → collection classes).


Phương pháp 2: Dùng endpoint import

Truy cập /students hoặc /classes trên giao diện.
Nhấn nút Nhập Excel và chọn file Excel (tạo từ students.json, classes.json).
Đảm bảo file Excel có các cột:
students: Mã SV, Tên SV, Lớp, Khoa, Khóa học.
classes: Mã Lớp, Tên Lớp.



Bảo trì

Gemini API:
Theo dõi quota tại Google Cloud Console.
Cập nhật GEMINI_API_KEY trong backend/.env nếu cần.


MongoDB:
Backup định kỳ: mongodump --db student_management --out backup/.
Kiểm tra index: db.students.getIndexes().


GitHub:
Không đẩy .env hoặc node_modules.
Cập nhật code:git add .
git commit -m "Update <tên tính năng>"
git push origin main





Lưu ý

Đảm bảo MongoDB chạy trước khi khởi động backend.
File .env chứa thông tin nhạy cảm, không đẩy lên GitHub.
Chatbot yêu cầu GEMINI_API_KEY hợp lệ để hoạt động.

