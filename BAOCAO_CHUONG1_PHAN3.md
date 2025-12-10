# CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ CƠ SỞ CÔNG NGHỆ (Tiếp theo)

---

## 1.5. Ứng dụng trí tuệ nhân tạo trong hệ thống

### 1.5.1. Tổng quan mô hình ngôn ngữ lớn và nền tảng Google Gemini

#### a) Mô hình ngôn ngữ lớn (Large Language Model - LLM)

**Large Language Model (LLM)** là các mô hình học sâu (deep learning) được huấn luyện trên lượng dữ liệu văn bản khổng lồ để hiểu và sinh ngôn ngữ tự nhiên. LLM sử dụng kiến trúc Transformer với cơ chế attention mechanism, cho phép xử lý các chuỗi văn bản dài và nắm bắt mối quan hệ ngữ cảnh phức tạp.

**Các ứng dụng chính của LLM:**
- Text Generation (Sinh văn bản)
- Question Answering (Hỏi đáp)
- Summarization (Tóm tắt)
- Translation (Dịch thuật)
- Code Generation (Sinh code)
- Reasoning (Suy luận)

#### b) Google Gemini AI

**Google Gemini** là dòng mô hình AI đa phương thức (multimodal) mới nhất của Google, ra mắt tháng 12/2023, được thiết kế để vượt trội trong nhiều tác vụ từ văn bản, hình ảnh đến code.

**Mô hình sử dụng trong dự án: Gemini 2.5 Flash-Lite**

| Đặc điểm | Giá trị |
|----------|---------|
| **Context Window** | 32,000 tokens |
| **Multimodal** | Text, Image, Audio, Video |
| **Latency** | Thấp, tối ưu cho real-time |
| **Cost** | Tiết kiệm hơn các model lớn |
| **Use case** | Chat, Q&A, Content Generation |

**Tích hợp trong dự án:**

```typescript
// functions/src/index.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Khởi tạo với API key bảo mật qua environment variable
function getGenAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  return new GoogleGenerativeAI(apiKey);
}

// Sử dụng model Gemini 2.5 Flash-Lite
const model = getGenAI().getGenerativeModel({ 
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 32000
  }
});
```

#### c) AI Question Generator

Module **AI Question Generator** cho phép tự động sinh câu hỏi từ chủ đề hoặc nội dung được cung cấp:

**Quy trình hoạt động:**

```
┌─────────────────────────────────────────────────────────────────┐
│               AI QUESTION GENERATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐          │
│  │  Input   │    │  Gemini AI  │    │   Output     │          │
│  │          │───▶│             │───▶│              │          │
│  │ • Topic  │    │ • Prompt    │    │ • Questions  │          │
│  │ • Content│    │ • Generate  │    │ • Answers    │          │
│  │ • Config │    │ • Parse     │    │ • Explain    │          │
│  └──────────┘    └─────────────┘    └──────────────┘          │
│                                                                 │
│  Input Types:                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │  Text   │ │   PDF   │ │  Image  │ │  Topic  │             │
│  │ Content │ │  File   │ │  (OCR)  │ │  Name   │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Các thư viện xử lý file:**

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| **pdfjs-dist** | 5.4.54 | Parse PDF files |
| **mammoth** | 1.9.1 | Parse DOC/DOCX files |
| **papaparse** | 5.5.3 | Parse CSV files |
| **xlsx** | 0.18.5 | Parse Excel files |
| **tesseract.js** | 6.0.1 | OCR - trích xuất text từ hình ảnh |

### 1.5.2. Kỹ thuật tăng cường tri thức bằng truy xuất dữ liệu (RAG)

#### a) Khái niệm RAG

**RAG (Retrieval-Augmented Generation)** là kỹ thuật kết hợp hai thành phần:
- **Retrieval (Truy xuất)**: Tìm kiếm thông tin liên quan từ cơ sở tri thức
- **Generation (Sinh)**: LLM sinh câu trả lời dựa trên thông tin đã truy xuất

**Tại sao cần RAG?**

| Vấn đề của LLM thuần | Giải pháp RAG |
|---------------------|---------------|
| Hallucination (bịa đặt) | Trả lời dựa trên dữ liệu thực |
| Kiến thức cũ (knowledge cutoff) | Cập nhật real-time từ database |
| Không biết context cụ thể | Inject dữ liệu quiz/bài học |
| Tốn token khi context dài | Chỉ lấy K documents liên quan nhất |

#### b) Kiến trúc RAG trong hệ thống

Hệ thống AI Learning Assistant sử dụng kiến trúc **Multi-Agent RAG**:

```
┌─────────────────────────────────────────────────────────────────┐
│                 MULTI-AGENT RAG ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    📝 User Question                                             │
│         │                                                       │
│         ▼                                                       │
│    ┌─────────────────┐                                         │
│    │  QUERY REWRITER │ ← Viết lại câu hỏi mơ hồ                │
│    │   (Gemini AI)   │   "cái đó" → "JavaScript"               │
│    └────────┬────────┘                                         │
│             ▼                                                   │
│    ┌─────────────────┐     ┌──────────────────────┐           │
│    │  INTENT ROUTER  │     │   INTENT CATEGORIES  │           │
│    │                 │────▶│  • quiz_search       │           │
│    │ (Regex + LLM)   │     │  • fact_retrieval    │           │
│    └────────┬────────┘     │  • learning_path     │           │
│             │              │  • general_chat      │           │
│             ▼              └──────────────────────┘           │
│    ┌─────────────────┐                                         │
│    │  HYBRID SEARCH  │                                         │
│    │ Vector + BM25   │                                         │
│    └────────┬────────┘                                         │
│             ▼                                                   │
│    ┌─────────────────┐                                         │
│    │   SYNTHESIZER   │ ← Tổng hợp câu trả lời                  │
│    │   (Gemini AI)   │                                         │
│    └────────┬────────┘                                         │
│             ▼                                                   │
│    📤 Response + Quiz Recommendations + Citations               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Các thành phần chính:**

**(1) Query Rewriter:**
Xử lý câu hỏi mơ hồ, có ngữ cảnh từ conversation history.
```
Input:  "Thế còn CSS?"
History: "Tôi muốn học JavaScript"
Output: "Lộ trình học CSS, liên quan đến JavaScript"
```

**(2) Intent Router:**
Phân loại ý định người dùng với 2 bước:
- Fast Path: Regex patterns (O(1) - instant)
- Slow Path: LLM classification (200-500ms)

**(3) Hybrid Search:**
Kết hợp Vector Search và BM25 Keyword Search.

**(4) Synthesizer:**
Sinh câu trả lời với Gemini AI, trích dẫn nguồn.

### 1.5.3. Vector Search và vai trò trong tìm kiếm và xử lý ngữ nghĩa

#### a) Embedding và Vector Space

**Embedding** là quá trình chuyển đổi dữ liệu (text, image) thành vector số trong không gian nhiều chiều, sao cho các items có ngữ nghĩa tương tự sẽ gần nhau trong không gian vector.

**Model sử dụng: Gemini Embedding-001**
- Output: Vector 768 chiều
- Optimized for: Semantic similarity

```typescript
// Ví dụ embedding
"JavaScript là gì?" → [0.021, -0.035, 0.089, ..., 0.018]  // 768 dimensions
```

#### b) Cosine Similarity

Đo độ tương đồng giữa 2 vectors bằng **Cosine Similarity**:

$$\text{similarity}(A, B) = \frac{A \cdot B}{||A|| \times ||B||} = \frac{\sum_{i=1}^{n} A_i \times B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \times \sqrt{\sum_{i=1}^{n} B_i^2}}$$

**Giá trị:**
- 1.0: Hoàn toàn giống nhau
- 0.0: Không liên quan
- -1.0: Hoàn toàn ngược nghĩa

#### c) BM25 - Keyword Search

**BM25 (Best Matching 25)** là thuật toán xếp hạng dựa trên tần suất từ khóa:

$$\text{BM25}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \times \frac{f(q_i, D) \times (k_1 + 1)}{f(q_i, D) + k_1 \times (1 - b + b \times \frac{|D|}{avgdl})}$$

Trong đó:
- $f(q_i, D)$: Tần suất từ $q_i$ trong document $D$
- $|D|$: Độ dài document
- $avgdl$: Độ dài trung bình của tất cả documents
- $k_1 = 1.2$, $b = 0.75$: Hyperparameters

#### d) Hybrid Search với Reciprocal Rank Fusion (RRF)

**Hybrid Search** kết hợp ưu điểm của cả Vector Search và BM25:

| Phương pháp | Ưu điểm | Nhược điểm |
|-------------|---------|------------|
| Vector Search | Hiểu ngữ nghĩa, đồng nghĩa | Có thể miss exact match |
| BM25 | Exact match chính xác | Không hiểu ngữ nghĩa |
| **Hybrid** | **Cả hai** | Phức tạp hơn |

**RRF (Reciprocal Rank Fusion):**

$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}$$

```
Vector Results: [Doc1, Doc3, Doc5]
BM25 Results:   [Doc3, Doc1, Doc4]

RRF Scores (k=60):
- Doc1: 1/(60+1) + 1/(60+2) = 0.0325
- Doc3: 1/(60+2) + 1/(60+1) = 0.0325
- Doc5: 1/(60+3) = 0.0159

Final: [Doc1, Doc3, Doc5, Doc4]
```

#### e) Vector Database - Orama

**Orama** là in-memory vector database được sử dụng cho Vector Search:

| Đặc điểm | Giá trị |
|----------|---------|
| Type | In-memory |
| Latency | ~5ms (cached) |
| Index Storage | Cloud Storage |
| Cache TTL | 5 phút |

**Cấu trúc Vector Index:**

```json
{
  "version": "4.3.2",
  "totalChunks": 1500,
  "chunks": [
    {
      "chunkId": "quiz_abc123_chunk_0",
      "quizId": "abc123",
      "title": "Quiz JavaScript Cơ Bản",
      "text": "JavaScript là ngôn ngữ lập trình...",
      "embedding": [0.021, -0.035, ..., 0.018],
      "metadata": {
        "category": "Programming",
        "difficulty": "easy"
      }
    }
  ]
}
```

---

## 1.6. Phương pháp nghiên cứu và bố cục đồ án

### 1.6.1. Phương pháp tiếp cận và triển khai nghiên cứu

#### a) Phương pháp nghiên cứu

**Phương pháp nghiên cứu tài liệu:**
- Nghiên cứu tài liệu về các công nghệ: React, TypeScript, Firebase, Google Gemini AI
- Tham khảo các best practices trong phát triển web application
- Phân tích các sản phẩm tương tự: Kahoot, Quizizz, Google Forms

**Phương pháp phân tích và thiết kế hệ thống:**
- Phân tích yêu cầu chức năng và phi chức năng
- Thiết kế kiến trúc hệ thống theo mô hình Feature-based Architecture
- Thiết kế cơ sở dữ liệu NoSQL với Firestore

**Phương pháp thực nghiệm:**
- Xây dựng prototype và iterative development
- Testing với Jest và React Testing Library
- Triển khai và kiểm thử trên môi trường production

#### b) Quy trình phát triển phần mềm

Dự án áp dụng quy trình **Agile/Iterative Development**:

```
┌─────────────────────────────────────────────────────────────────┐
│                 DEVELOPMENT PROCESS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sprint 1: Foundation                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Project setup (Vite, React, TypeScript)               │   │
│  │ • Firebase configuration                                │   │
│  │ • Authentication system                                 │   │
│  │ • Basic routing                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Sprint 2: Core Features                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Quiz CRUD operations                                  │   │
│  │ • 11 question types                                     │   │
│  │ • Quiz taking flow                                      │   │
│  │ • Results & analytics                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Sprint 3: Advanced Features                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • AI Question Generator                                 │   │
│  │ • RAG Chatbot                                           │   │
│  │ • Multiplayer system                                    │   │
│  │ • Admin panel                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Sprint 4: Optimization & Deployment                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Performance optimization                              │   │
│  │ • PWA & Offline support                                 │   │
│  │ • i18n (Internationalization)                           │   │
│  │ • Firebase Hosting deployment                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### c) Triển khai ứng dụng với Firebase Hosting

**Firebase Hosting** là dịch vụ hosting tĩnh của Firebase với các đặc điểm:
- Global CDN (Content Delivery Network)
- SSL certificate miễn phí
- Custom domain support
- Atomic deployments
- One-click rollbacks

**Cấu hình Firebase Hosting:**

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Quy trình triển khai:**

```bash
# 1. Build production
npm run build

# 2. Deploy to Firebase
firebase deploy --only hosting

# Hoặc deploy tất cả services
firebase deploy
```

**Cấu trúc deployment:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 FIREBASE DEPLOYMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  npm run build                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                               │
│  │   dist/     │  ← Production bundle                          │
│  │   ├── index.html                                            │
│  │   ├── assets/                                               │
│  │   │   ├── index-[hash].js                                   │
│  │   │   ├── index-[hash].css                                  │
│  │   │   └── vendor-[hash].js                                  │
│  │   └── locales/                                              │
│  └─────────────┘                                               │
│       │                                                         │
│       ▼                                                         │
│  firebase deploy                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FIREBASE HOSTING (CDN)                     │   │
│  │  • SSL: https://datn-quizapp.web.app                   │   │
│  │  • Global CDN: 150+ edge locations                      │   │
│  │  • Atomic deployment with versioning                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.6.2. Cấu trúc và nội dung các chương của đồ án

Đồ án được tổ chức thành các chương với nội dung như sau:

| Chương | Tiêu đề | Nội dung chính |
|--------|---------|----------------|
| **Chương 1** | Tổng quan đề tài và cơ sở công nghệ | Giới thiệu vấn đề, mục tiêu, phạm vi, công nghệ sử dụng |
| **Chương 2** | Phân tích và thiết kế hệ thống | Phân tích yêu cầu, Use case, thiết kế database, kiến trúc |
| **Chương 3** | Xây dựng và triển khai hệ thống | Chi tiết implementation, các module chức năng |
| **Chương 4** | Kiểm thử và đánh giá | Testing, performance, kết quả đạt được |
| **Chương 5** | Kết luận và hướng phát triển | Tổng kết, hạn chế, đề xuất phát triển |

---

## Tổng kết Chương 1

Chương 1 đã trình bày tổng quan về đề tài nghiên cứu **"Xây dựng hệ thống ứng dụng web Quiz/Trắc nghiệm trực tuyến - QuizTrivia App"** với các nội dung chính:

**1. Tổng quan vấn đề nghiên cứu:**
- Bối cảnh chuyển đổi số giáo dục và xu hướng EdTech
- Những hạn chế trong hoạt động kiểm tra - đánh giá hiện nay
- Tính cấp thiết và ý nghĩa của đề tài

**2. Mục tiêu và phạm vi:**
- Mục tiêu xây dựng hệ thống quiz đa dạng, tích hợp AI, hỗ trợ multiplayer
- Phạm vi 10 module chức năng, đối tượng sử dụng đa dạng
- Giới hạn trên nền tảng web application

**3. Cơ sở công nghệ Frontend:**
- React 18 với hooks và concurrent features
- TypeScript cho type safety và maintainability
- Vite build tool với tốc độ vượt trội
- Tailwind CSS cho rapid UI development
- Hệ sinh thái thư viện hỗ trợ phong phú

**4. Cơ sở công nghệ Backend (Firebase):**
- Kiến trúc Serverless với Firebase
- Authentication và phân quyền
- Cloud Firestore cho structured data
- Realtime Database cho live features
- Cloud Functions cho server-side logic
- Firebase Hosting cho deployment

**5. Ứng dụng AI:**
- Google Gemini AI cho question generation
- Kiến trúc RAG cho AI chatbot
- Vector Search và Hybrid Search cho semantic retrieval

**6. Phương pháp nghiên cứu:**
- Quy trình Agile/Iterative Development
- Triển khai với Firebase Hosting

Các chương tiếp theo sẽ trình bày chi tiết về phân tích, thiết kế và xây dựng hệ thống QuizTrivia App.

---

## Bảng tổng hợp công nghệ sử dụng

| Nhóm | Công nghệ | Phiên bản | Mục đích |
|------|-----------|-----------|----------|
| **Frontend** | React | 18.2.0 | UI Library |
| | TypeScript | 5.2.2 | Type-safe JavaScript |
| | Vite | 5.4.19 | Build tool |
| | Tailwind CSS | 3.4.17 | CSS Framework |
| | Redux Toolkit | 1.9.7 | State Management |
| | React Router | 7.6.3 | Routing |
| | i18next | 25.3.2 | Internationalization |
| | Framer Motion | 12.23.24 | Animations |
| **Backend** | Firebase | 10.14.1 | BaaS Platform |
| | Firestore | - | NoSQL Database |
| | Realtime Database | - | Real-time sync |
| | Cloud Functions | Node.js 18 | Serverless backend |
| | Cloud Storage | - | File storage |
| | Firebase Hosting | - | Web hosting |
| **AI** | Google Gemini | 2.5 Flash-Lite | LLM |
| | Gemini Embedding | 001 | Vector embedding |
| | Orama | - | Vector search |
| **Testing** | Jest | 29.7.0 | Testing framework |
| | React Testing Library | 16.3.0 | Component testing |
| **Tools** | ESLint | 8.55.0 | Linting |
| | Storybook | 10.0.7 | Component docs |

---

*Hết Chương 1*

*Đồ án tốt nghiệp - Hệ thống QuizTrivia App*
