# CHƯƠNG 1: GIỚI THIỆU

---

## 1.1 Lý do chọn đề tài

### 1.1.1 Bối cảnh và xu hướng

Trong bối cảnh chuyển đổi số toàn cầu, ngành giáo dục đang trải qua những thay đổi sâu sắc với sự phát triển mạnh mẽ của công nghệ thông tin. Đặc biệt, sau đại dịch COVID-19, nhu cầu học tập trực tuyến (E-learning) đã tăng trưởng đột biến và trở thành xu hướng không thể đảo ngược. Theo báo cáo của UNESCO, hơn 1,6 tỷ học sinh trên toàn thế giới đã phải chuyển sang hình thức học tập trực tuyến trong giai đoạn đại dịch, tạo ra một bước ngoặt lớn trong cách tiếp cận giáo dục.

Tại Việt Nam, thị trường EdTech (Education Technology - Công nghệ giáo dục) đang phát triển với tốc độ nhanh chóng. Theo thống kê của Ken Research, thị trường EdTech Việt Nam dự kiến đạt giá trị 3 tỷ USD vào năm 2025, với tốc độ tăng trưởng kép hàng năm (CAGR) khoảng 20%. Điều này cho thấy tiềm năng to lớn của lĩnh vực công nghệ giáo dục tại Việt Nam.

### 1.1.2 Thực trạng và vấn đề

Trong quá trình học tập và giảng dạy, việc kiểm tra, đánh giá kiến thức đóng vai trò quan trọng. Tuy nhiên, các phương pháp truyền thống đang gặp phải nhiều hạn chế:

**Về phía giáo viên/người tạo nội dung:**
- Việc soạn đề thi, câu hỏi trắc nghiệm tốn nhiều thời gian và công sức
- Khó khăn trong việc quản lý ngân hàng câu hỏi lớn
- Hạn chế trong việc theo dõi tiến độ học tập của người học
- Thiếu công cụ phân tích kết quả học tập một cách hệ thống

**Về phía người học:**
- Thiếu nguồn tài liệu ôn tập có hệ thống và đa dạng
- Khó đánh giá được mức độ nắm vững kiến thức của bản thân
- Hình thức học tập đơn điệu, thiếu tính tương tác và hấp dẫn
- Không có phản hồi tức thì về kết quả học tập

### 1.1.3 Sự cần thiết của đề tài

Xuất phát từ những thực trạng trên, việc xây dựng một hệ thống Quiz/Trắc nghiệm trực tuyến hiện đại là vô cùng cần thiết, nhằm:

1. **Tự động hóa quy trình**: Giúp giáo viên/người tạo nội dung tiết kiệm thời gian trong việc soạn đề và chấm điểm thông qua việc tích hợp trí tuệ nhân tạo (AI) để tự động sinh câu hỏi.

2. **Nâng cao trải nghiệm học tập**: Tạo môi trường học tập tương tác, sinh động với nhiều loại câu hỏi đa dạng (trắc nghiệm, đúng/sai, điền khuyết, ghép cặp, sắp xếp thứ tự, multimedia...).

3. **Hỗ trợ học tập cá nhân hóa**: Cung cấp hệ thống AI chatbot thông minh (RAG - Retrieval-Augmented Generation) để hỗ trợ người học giải đáp thắc mắc dựa trên nội dung quiz đã học.

4. **Tăng cường tương tác**: Xây dựng chế độ chơi đối kháng nhiều người (Multiplayer) để tăng tính cạnh tranh và động lực học tập.

5. **Đa nền tảng và đa ngôn ngữ**: Phát triển ứng dụng web responsive, hỗ trợ đa ngôn ngữ (Tiếng Việt, Tiếng Anh) để tiếp cận đa dạng đối tượng người dùng.

### 1.1.4 Tính mới và sáng tạo của đề tài

Đề tài không chỉ là một ứng dụng quiz thông thường mà còn tích hợp nhiều công nghệ tiên tiến:

- **Trí tuệ nhân tạo (AI)**: Sử dụng Google Gemini AI để tự động sinh câu hỏi từ chủ đề, giúp giảm tải công việc cho người tạo nội dung.

- **Chatbot RAG thông minh**: Xây dựng hệ thống AI Learning Assistant sử dụng kiến trúc Multi-Agent RAG với Vector Search (Orama) và BM25, cho phép người học hỏi đáp về nội dung đã học.

- **Real-time Multiplayer**: Tích hợp Firebase Realtime Database để xây dựng chế độ chơi đối kháng nhiều người theo thời gian thực.

- **Hybrid Storage Architecture**: Kết hợp Firestore và Cloud Storage để tối ưu chi phí và hiệu năng lưu trữ.

- **Progressive Web App (PWA)**: Hỗ trợ offline mode, cho phép người dùng học tập ngay cả khi không có kết nối internet.

---

## 1.2 Mục đích

### 1.2.1 Mục đích tổng quát

Xây dựng và phát triển một hệ thống ứng dụng web Quiz/Trắc nghiệm trực tuyến hiện đại, toàn diện, có tên **QuizTrivia App**, nhằm cung cấp một nền tảng học tập và kiểm tra kiến thức thông minh, tương tác cao, đáp ứng nhu cầu của nhiều đối tượng người dùng từ học sinh, sinh viên, giáo viên đến các tổ chức đào tạo.

### 1.2.2 Mục đích cụ thể

#### Đối với người học (User):
- Cung cấp nền tảng ôn tập kiến thức qua các bài quiz đa dạng về chủ đề và mức độ khó
- Hỗ trợ học tập cá nhân hóa thông qua AI chatbot giải đáp thắc mắc
- Tạo môi trường học tập thi đua thông qua bảng xếp hạng (Leaderboard) và chế độ Multiplayer
- Cho phép học tập offline qua tính năng tải quiz về thiết bị
- Theo dõi tiến độ và kết quả học tập một cách hệ thống

#### Đối với người tạo nội dung (Creator):
- Cung cấp công cụ tạo quiz mạnh mẽ với 11 loại câu hỏi khác nhau
- Hỗ trợ tạo câu hỏi tự động bằng AI, tiết kiệm thời gian
- Cho phép import câu hỏi từ nhiều định dạng file (PDF, DOC, CSV, Excel)
- Tích hợp tài liệu học tập (video, PDF, ảnh) vào quiz
- Quản lý quiz với quy trình Draft/Publish chuyên nghiệp

#### Đối với quản trị viên (Admin):
- Cung cấp dashboard quản lý toàn diện với thống kê chi tiết
- Quy trình phê duyệt quiz để đảm bảo chất lượng nội dung
- Quản lý người dùng và phân quyền hệ thống
- Theo dõi hoạt động và hiệu suất của hệ thống

#### Đối với mục tiêu học thuật:
- Áp dụng và củng cố kiến thức về phát triển ứng dụng web hiện đại
- Nghiên cứu và triển khai các công nghệ tiên tiến như AI, Real-time Database
- Thực hành quy trình phát triển phần mềm chuyên nghiệp
- Tích lũy kinh nghiệm xây dựng hệ thống có khả năng mở rộng (scalable)

---

## 1.3 Đối tượng

### 1.3.1 Đối tượng nghiên cứu

Đề tài tập trung nghiên cứu và xây dựng **Hệ thống ứng dụng web Quiz/Trắc nghiệm trực tuyến** với các thành phần chính:

1. **Hệ thống quản lý Quiz**:
   - Tạo, chỉnh sửa, xóa quiz
   - 11 loại câu hỏi: Multiple Choice, True/False, Short Answer, Checkbox, Image, Audio, Video, Ordering, Matching, Fill in the Blanks, Rich Content
   - Hệ thống phân loại theo danh mục và độ khó
   - Quy trình phê duyệt Draft/Pending/Approved/Rejected

2. **Hệ thống xác thực và phân quyền**:
   - Đăng ký, đăng nhập với Firebase Authentication
   - Xác thực OTP qua email
   - Phân quyền: User, Creator, Admin

3. **Hệ thống AI tích hợp**:
   - AI Question Generator (Google Gemini AI)
   - AI Learning Assistant Chatbot (RAG Architecture)
   - Hybrid Search (Vector Search + BM25)

4. **Hệ thống Multiplayer**:
   - Tạo phòng chơi, mời bạn bè
   - Chơi quiz đối kháng theo thời gian thực
   - Bảng xếp hạng và kết quả trận đấu

5. **Hệ thống tài liệu học tập (Learning Materials)**:
   - Tích hợp video, PDF, hình ảnh, link
   - Theo dõi tiến độ xem tài liệu
   - Gating system (yêu cầu xem tài liệu trước khi làm quiz)

6. **Hệ thống quản trị (Admin Panel)**:
   - Dashboard thống kê
   - Quản lý người dùng và quiz
   - Phê duyệt nội dung

### 1.3.2 Đối tượng sử dụng

Hệ thống được thiết kế để phục vụ các nhóm đối tượng sau:

| STT | Đối tượng | Vai trò | Mô tả |
|-----|-----------|---------|-------|
| 1 | **Học sinh, Sinh viên** | User | Người dùng cuối, sử dụng hệ thống để ôn tập kiến thức, làm quiz, thi đua với bạn bè |
| 2 | **Người tự học** | User | Các cá nhân muốn trau dồi kiến thức ở nhiều lĩnh vực khác nhau |
| 3 | **Giáo viên, Giảng viên** | Creator/Admin | Tạo quiz, quản lý ngân hàng câu hỏi, theo dõi kết quả học tập của học sinh |
| 4 | **Người tạo nội dung** | Creator | Cá nhân hoặc tổ chức tạo quiz để chia sẻ kiến thức |
| 5 | **Quản trị viên hệ thống** | Admin | Quản lý toàn bộ hệ thống, phê duyệt nội dung, quản lý người dùng |
| 6 | **Doanh nghiệp, Tổ chức** | Admin/Creator | Sử dụng hệ thống để đào tạo nội bộ, kiểm tra năng lực nhân viên |

### 1.3.3 Đối tượng công nghệ

Đề tài nghiên cứu và áp dụng các công nghệ tiên tiến trong lĩnh vực phát triển web:

- **Frontend Framework**: React 18 với TypeScript
- **Build Tool**: Vite
- **Backend as a Service (BaaS)**: Firebase (Authentication, Firestore, Realtime Database, Cloud Storage, Cloud Functions)
- **Artificial Intelligence**: Google Gemini AI, RAG Architecture
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Internationalization**: i18next
- **Testing**: Jest, React Testing Library

---

## 1.4 Phạm vi nghiên cứu

### 1.4.1 Phạm vi về chức năng

Hệ thống QuizTrivia App được xây dựng với các module chức năng sau:

#### Module 1: Quản lý người dùng (Authentication & User Management)
- Đăng ký tài khoản mới với email
- Đăng nhập/Đăng xuất
- Xác thực OTP qua email
- Quản lý hồ sơ cá nhân (avatar, tên hiển thị)
- Xem thống kê cá nhân (số quiz đã làm, điểm trung bình)
- Phân quyền người dùng (User, Creator, Admin)

#### Module 2: Quản lý Quiz (Quiz Management)
- Tạo quiz mới với 11 loại câu hỏi
- Chỉnh sửa, xóa quiz
- Import câu hỏi từ file (PDF, DOC, CSV, Excel)
- Tạo câu hỏi tự động bằng AI
- Thiết lập độ khó, thời gian, mật khẩu bảo vệ
- Quy trình Draft/Publish
- Tìm kiếm, lọc quiz theo danh mục

#### Module 3: Làm Quiz (Quiz Taking)
- Làm quiz với đồng hồ đếm ngược
- Hỗ trợ 11 loại câu hỏi tương tác
- Hiển thị kết quả chi tiết với giải thích
- Lưu lịch sử làm quiz
- Xem lại đáp án và phân tích

#### Module 4: Tài liệu học tập (Learning Materials)
- Xem video, PDF, hình ảnh trước khi làm quiz
- Theo dõi tiến độ xem tài liệu
- Gating system (bắt buộc xem tài liệu)
- Ôn tập sau khi làm quiz

#### Module 5: AI Chatbot (AI Learning Assistant)
- Hỏi đáp về nội dung quiz đã học
- Trích dẫn nguồn tham khảo
- Gợi ý quiz liên quan
- Hỗ trợ tiếng Việt và tiếng Anh

#### Module 6: Multiplayer (Chơi đối kháng)
- Tạo phòng chơi
- Mời bạn bè qua mã phòng/QR code
- Chơi quiz đối kháng thời gian thực
- Bảng xếp hạng trận đấu
- Chat trong phòng

#### Module 7: Bảng xếp hạng (Leaderboard)
- Xếp hạng theo quiz
- Xếp hạng tổng thể
- Xếp hạng theo tuần/tháng

#### Module 8: Quản trị hệ thống (Admin Panel)
- Dashboard thống kê tổng quan
- Quản lý người dùng (xem, khóa, phân quyền)
- Phê duyệt quiz (approve/reject)
- Xem thống kê chi tiết

#### Module 9: Đa ngôn ngữ (Internationalization)
- Hỗ trợ Tiếng Việt
- Hỗ trợ Tiếng Anh
- Tự động phát hiện ngôn ngữ trình duyệt

#### Module 10: Offline Mode
- Tải quiz về thiết bị
- Làm quiz offline
- Đồng bộ kết quả khi có mạng

### 1.4.2 Phạm vi về kỹ thuật

| Tiêu chí | Phạm vi |
|----------|---------|
| **Nền tảng** | Web Application (Responsive cho Desktop, Tablet, Mobile) |
| **Trình duyệt hỗ trợ** | Chrome, Firefox, Safari, Edge (phiên bản hiện đại) |
| **Ngôn ngữ lập trình** | TypeScript, JavaScript |
| **Kiến trúc** | Single Page Application (SPA) với Feature-based Architecture |
| **Backend** | Serverless (Firebase Cloud Functions) |
| **Database** | NoSQL (Firestore, Realtime Database) |
| **AI/ML** | Google Gemini AI, Vector Search (Orama) |
| **Hosting** | Firebase Hosting |

### 1.4.3 Phạm vi về thời gian và nguồn lực

- **Thời gian phát triển**: Phù hợp với khung thời gian đồ án tốt nghiệp
- **Nhân lực**: Cá nhân hoặc nhóm nhỏ
- **Chi phí**: Sử dụng các dịch vụ có gói miễn phí (Firebase Free Tier, Gemini AI Free Tier)

### 1.4.4 Giới hạn phạm vi

Đề tài **KHÔNG** bao gồm:
- Phát triển ứng dụng mobile native (iOS, Android)
- Tích hợp thanh toán trực tuyến
- Hệ thống live streaming
- Hệ thống certificate/chứng chỉ tự động
- Tích hợp với LMS (Learning Management System) bên ngoài

---

## 1.5 Công nghệ sử dụng

### 1.5.1 Frontend Technologies

#### 1.5.1.1 React 18
- **Mô tả**: Thư viện JavaScript phổ biến nhất để xây dựng giao diện người dùng
- **Phiên bản**: 18.2.0
- **Tính năng sử dụng**:
  - Functional Components với Hooks
  - React Concurrent Mode
  - Automatic Batching
  - Suspense for Data Fetching
- **Lý do chọn**: 
  - Hiệu suất cao với Virtual DOM
  - Cộng đồng lớn, tài liệu phong phú
  - Hệ sinh thái thư viện đa dạng
  - Component-based architecture dễ bảo trì

#### 1.5.1.2 TypeScript
- **Mô tả**: Ngôn ngữ lập trình mở rộng của JavaScript với hỗ trợ kiểu dữ liệu tĩnh
- **Phiên bản**: 5.2.2
- **Lý do chọn**:
  - Type safety giúp phát hiện lỗi sớm
  - IntelliSense tốt hơn trong IDE
  - Dễ refactor code
  - Tài liệu code tự động qua type definitions

#### 1.5.1.3 Vite
- **Mô tả**: Build tool thế hệ mới cho web development
- **Phiên bản**: 5.4.19
- **Tính năng**:
  - Hot Module Replacement (HMR) cực nhanh
  - Native ES Modules
  - Optimized production build
- **Lý do chọn**:
  - Thời gian khởi động server nhanh hơn Webpack 10-100 lần
  - Cấu hình đơn giản
  - Hỗ trợ TypeScript, JSX out of the box

#### 1.5.1.4 Tailwind CSS
- **Mô tả**: Utility-first CSS framework
- **Phiên bản**: 3.4.17
- **Lý do chọn**:
  - Phát triển giao diện nhanh chóng
  - Tùy chỉnh cao
  - Tối ưu kích thước bundle (PurgeCSS)
  - Responsive design dễ dàng

#### 1.5.1.5 Redux Toolkit
- **Mô tả**: Thư viện quản lý state chính thức cho React
- **Phiên bản**: 1.9.7
- **Tính năng sử dụng**:
  - createSlice cho reducers
  - createAsyncThunk cho async actions
  - RTK Query cho data fetching
- **Lý do chọn**:
  - Giảm boilerplate code
  - Tích hợp Immer cho immutable updates
  - DevTools mạnh mẽ

#### 1.5.1.6 React Router
- **Mô tả**: Thư viện routing cho React
- **Phiên bản**: 7.6.3
- **Tính năng**:
  - Declarative routing
  - Nested routes
  - Protected routes
  - Lazy loading routes

#### 1.5.1.7 Framer Motion
- **Mô tả**: Thư viện animation cho React
- **Phiên bản**: 12.23.24
- **Sử dụng cho**:
  - Page transitions
  - Component animations
  - Gesture-based interactions
  - Drag and drop (ordering questions)

#### 1.5.1.8 i18next
- **Mô tả**: Framework quốc tế hóa cho JavaScript
- **Phiên bản**: 25.3.2
- **Tính năng**:
  - Lazy loading translations
  - Pluralization
  - Interpolation
  - Language detection

#### 1.5.1.9 Recharts
- **Mô tả**: Thư viện biểu đồ cho React
- **Phiên bản**: 3.1.0
- **Sử dụng cho**:
  - Dashboard statistics
  - Quiz analytics
  - User progress charts

#### 1.5.1.10 Các thư viện UI/UX khác
| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| Lucide React | 0.536.0 | Icon library |
| React Toastify | 11.0.5 | Toast notifications |
| React Quill | 2.0.3 | Rich text editor |
| DND Kit | 6.3.1 | Drag and drop |
| Canvas Confetti | 1.9.4 | Celebration effects |

### 1.5.2 Backend Technologies (Firebase)

#### 1.5.2.1 Firebase Authentication
- **Mô tả**: Dịch vụ xác thực người dùng
- **Tính năng sử dụng**:
  - Email/Password authentication
  - Session persistence
  - Security rules integration
- **Ưu điểm**:
  - Bảo mật cao
  - Dễ tích hợp
  - Hỗ trợ nhiều providers

#### 1.5.2.2 Cloud Firestore
- **Mô tả**: NoSQL document database
- **Sử dụng cho**:
  - Users collection
  - Quizzes collection
  - Quiz results
  - Match histories
- **Tính năng**:
  - Real-time listeners
  - Offline persistence
  - Security rules
  - Compound queries
- **Cấu trúc dữ liệu**:
```
/users/{userId}
/quizzes/{quizId}
/quiz_results/{resultId}
/match_histories/{matchId}
```

#### 1.5.2.3 Firebase Realtime Database
- **Mô tả**: Real-time JSON database
- **Sử dụng cho**:
  - Multiplayer rooms
  - Live presence
  - Chat messages
- **Lý do chọn**:
  - Latency thấp (< 100ms)
  - Chi phí thấp hơn Firestore cho writes nhiều
  - Perfect cho real-time features

#### 1.5.2.4 Cloud Storage
- **Mô tả**: Object storage cho files
- **Sử dụng cho**:
  - User avatars
  - Quiz images
  - Learning materials (PDF, video, audio)
- **Tính năng**:
  - Security rules
  - CDN integration
  - Direct upload from client

#### 1.5.2.5 Cloud Functions
- **Mô tả**: Serverless functions
- **Sử dụng cho**:
  - AI question generation (secure API key)
  - RAG chatbot backend
  - Email notifications
  - Scheduled tasks
- **Runtime**: Node.js 18

#### 1.5.2.6 Firebase Hosting
- **Mô tả**: Static web hosting
- **Tính năng**:
  - Global CDN
  - SSL certificate
  - Custom domain support

### 1.5.3 Artificial Intelligence Technologies

#### 1.5.3.1 Google Gemini AI
- **Mô tả**: Large Language Model (LLM) của Google
- **Model sử dụng**: Gemini 2.5 Flash-Lite
- **Tính năng**:
  - Text generation
  - Question generation
  - Intent classification
  - Answer synthesis
- **Tích hợp qua**: @google/generative-ai SDK

#### 1.5.3.2 RAG Architecture (Retrieval-Augmented Generation)
- **Mô tả**: Kiến trúc kết hợp retrieval và generation
- **Thành phần**:
  - **Query Rewriter**: Viết lại câu hỏi mơ hồ
  - **Intent Router**: Phân loại ý định người dùng
  - **Hybrid Search**: Vector Search + BM25
  - **AI Reranker**: Xếp hạng lại kết quả
  - **Synthesizer**: Tổng hợp câu trả lời

#### 1.5.3.3 Vector Search (Orama)
- **Mô tả**: In-memory vector database
- **Tính năng**:
  - Semantic search
  - Fast retrieval
  - No external dependencies
- **Embedding model**: Gemini Embedding-001 (768 dimensions)

#### 1.5.3.4 BM25 Search
- **Mô tả**: Thuật toán keyword search cổ điển
- **Kết hợp với Vector Search để tạo Hybrid Search**
- **Ưu điểm**:
  - Chính xác với từ khóa cụ thể
  - Không cần embedding
  - Nhanh

### 1.5.4 Development & Testing Tools

#### 1.5.4.1 Jest
- **Mô tả**: JavaScript testing framework
- **Phiên bản**: 29.7.0
- **Loại test**:
  - Unit tests
  - Integration tests
  - Snapshot tests

#### 1.5.4.2 React Testing Library
- **Mô tả**: Testing utilities cho React
- **Phiên bản**: 16.3.0
- **Philosophy**: Test như người dùng thật

#### 1.5.4.3 Storybook
- **Mô tả**: UI component development environment
- **Phiên bản**: 10.0.7
- **Sử dụng cho**:
  - Component documentation
  - Visual testing
  - Isolated development

#### 1.5.4.4 ESLint
- **Mô tả**: JavaScript/TypeScript linter
- **Phiên bản**: 8.55.0
- **Plugins**:
  - @typescript-eslint
  - eslint-plugin-react-hooks
  - eslint-plugin-i18next

### 1.5.5 Other Technologies

#### 1.5.5.1 File Processing Libraries
| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| pdfjs-dist | 5.4.54 | Parse PDF files |
| mammoth | 1.9.1 | Parse DOC/DOCX files |
| papaparse | 5.5.3 | Parse CSV files |
| xlsx | 0.18.5 | Parse Excel files |
| tesseract.js | 6.0.1 | OCR (Image to text) |

#### 1.5.5.2 Media Libraries
| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| howler | 2.2.4 | Audio playback |
| react-youtube | 10.1.0 | YouTube integration |
| qrcode | 1.5.6 | QR code generation |

#### 1.5.5.3 Security Libraries
| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| dompurify | 3.3.0 | XSS protection |
| crypto-js | 4.2.0 | Encryption (password hash) |

#### 1.5.5.4 Offline & PWA
| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| dexie | 4.0.11 | IndexedDB wrapper |
| workbox | 7.3.0 | Service worker |
| vite-plugin-pwa | 1.1.0 | PWA support |

### 1.5.6 Tổng kết công nghệ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KIẾN TRÚC HỆ THỐNG QUIZTRIVIA APP                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND (Client)                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │   React 18  │ │ TypeScript  │ │  Tailwind   │ │   Redux     │  │   │
│  │  │   + Vite    │ │             │ │     CSS     │ │   Toolkit   │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │   i18next   │ │   Framer    │ │  Recharts   │ │   DND Kit   │  │   │
│  │  │             │ │   Motion    │ │             │ │             │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FIREBASE SERVICES (Backend)                    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │    Auth     │ │  Firestore  │ │  Realtime   │ │   Cloud     │  │   │
│  │  │             │ │             │ │   Database  │ │   Storage   │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  │  ┌─────────────┐ ┌─────────────┐                                   │   │
│  │  │   Cloud     │ │   Firebase  │                                   │   │
│  │  │  Functions  │ │   Hosting   │                                   │   │
│  │  └─────────────┘ └─────────────┘                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AI SERVICES (Intelligence)                     │   │
│  │  ┌───────────────────────────┐ ┌───────────────────────────────┐   │   │
│  │  │      Google Gemini AI     │ │       RAG Architecture        │   │   │
│  │  │  ┌─────────────────────┐  │ │  ┌─────────────────────────┐  │   │   │
│  │  │  │   Gemini 2.5 Flash  │  │ │  │   Vector Search (Orama) │  │   │   │
│  │  │  │      Lite           │  │ │  │   + BM25 Hybrid Search  │  │   │   │
│  │  │  └─────────────────────┘  │ │  └─────────────────────────┘  │   │   │
│  │  │  ┌─────────────────────┐  │ │  ┌─────────────────────────┐  │   │   │
│  │  │  │  Embedding-001      │  │ │  │   Multi-Agent System    │  │   │   │
│  │  │  │  (768 dimensions)   │  │ │  │   (Query → Response)    │  │   │   │
│  │  │  └─────────────────────┘  │ │  └─────────────────────────┘  │   │   │
│  │  └───────────────────────────┘ └───────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Bảng tổng hợp version các công nghệ chính:**

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| React | 18.2.0 | UI Library |
| TypeScript | 5.2.2 | Programming Language |
| Vite | 5.4.19 | Build Tool |
| Tailwind CSS | 3.4.17 | CSS Framework |
| Redux Toolkit | 1.9.7 | State Management |
| Firebase | 10.14.1 | Backend as a Service |
| Google Gemini AI | Latest | AI/LLM |
| i18next | 25.3.2 | Internationalization |
| Jest | 29.7.0 | Testing |
| Framer Motion | 12.23.24 | Animation |

---

## Kết luận Chương 1

Chương này đã trình bày tổng quan về đề tài **"Xây dựng hệ thống ứng dụng web Quiz/Trắc nghiệm trực tuyến - QuizTrivia App"**, bao gồm:

1. **Lý do chọn đề tài**: Xuất phát từ nhu cầu thực tiễn của việc học tập trực tuyến, đặc biệt sau đại dịch COVID-19, cùng với xu hướng phát triển mạnh mẽ của EdTech tại Việt Nam và thế giới.

2. **Mục đích**: Xây dựng một nền tảng quiz trực tuyến hiện đại, tích hợp AI, hỗ trợ đa dạng loại câu hỏi và chế độ chơi, phục vụ nhiều đối tượng người dùng.

3. **Đối tượng**: Bao gồm đối tượng nghiên cứu (hệ thống quiz, AI chatbot, multiplayer...), đối tượng sử dụng (học sinh, giáo viên, admin...), và đối tượng công nghệ (React, Firebase, Gemini AI...).

4. **Phạm vi nghiên cứu**: 10 module chức năng chính, giới hạn trên nền tảng web, không bao gồm ứng dụng mobile native.

5. **Công nghệ sử dụng**: Stack công nghệ hiện đại với React 18, TypeScript, Firebase, Google Gemini AI, và kiến trúc RAG cho chatbot.

Trong các chương tiếp theo, đồ án sẽ trình bày chi tiết về cơ sở lý thuyết, phân tích thiết kế hệ thống, và kết quả triển khai thực tế của ứng dụng QuizTrivia App.

---

*Chương 1 - Giới thiệu*
*Đồ án tốt nghiệp - QuizTrivia App*
