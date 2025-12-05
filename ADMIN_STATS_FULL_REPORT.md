# 📊 BÁO CÁO CHI TIẾT HOÀN CHỈNH - TRANG ADMIN STATS

> **File**: `src/features/admin/components/AdminStats.tsx`  
> **Route**: `/admin/quiz-stats`  
> **Wrapper**: `src/features/admin/pages/StatsDashboard.tsx`  
> **Service**: `src/services/adminStatsService.ts`  
> **Ngày báo cáo**: 3/12/2025

---

## 📁 CẤU TRÚC FILE

```
src/
├── features/admin/
│   ├── components/
│   │   └── AdminStats.tsx          # Component chính (877 dòng)
│   └── pages/
│       └── StatsDashboard.tsx      # Wrapper page
├── services/
│   └── adminStatsService.ts        # Service lấy data từ Firebase
└── public/locales/
    ├── vi/common.json              # i18n tiếng Việt
    └── en/common.json              # i18n tiếng Anh
```

---

## 🎨 TỔNG QUAN UI/UX

### Layout chung
- **Background**: `bg-gray-50` (xám nhạt)
- **Container**: `max-w-7xl mx-auto px-4` (giới hạn chiều rộng, căn giữa)
- **Padding**: `py-8` (padding trên dưới 32px)
- **Card style**: `bg-white rounded-xl shadow-sm border border-gray-100 p-6`
- **Hover effect**: `hover:shadow-md transition-all duration-200`

### Màu sắc chủ đạo
| Màu | Hex Code | Sử dụng cho |
|-----|----------|-------------|
| Blue | `#3B82F6` | Users, Primary actions |
| Green | `#10B981` | Quiz đã duyệt, Thành công |
| Yellow | `#F59E0B` | Pending, Warning |
| Red | `#EF4444` | Admin, Error |
| Purple | `#8B5CF6` | Completions |
| Orange | `#F97316` | Creators |
| Indigo | `#6366F1` | Reviews |
| Gray | `#6B7280` | Secondary info |

### Typography
- **Tiêu đề trang**: `text-3xl font-bold text-gray-900`
- **Tiêu đề section**: `text-lg font-semibold text-gray-900`
- **Label**: `text-sm font-medium text-gray-600`
- **Value lớn**: `text-2xl font-bold text-gray-900`
- **Subtext**: `text-xs text-gray-500`

---

## 🏠 HEADER SECTION

### Cấu trúc
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Thống kê Quiz                        [Làm mới] [Xuất dữ liệu▼]│
│  Dữ liệu thực từ Firebase - Cập nhật realtime                    │
└─────────────────────────────────────────────────────────────────┘
```

### Chi tiết UI
| Element | Class/Style | Mô tả |
|---------|-------------|-------|
| Tiêu đề | `text-3xl font-bold text-gray-900 mb-2` | "📊 Thống kê Quiz" |
| Subtitle | `text-gray-600` | "Dữ liệu thực từ Firebase - Cập nhật realtime" |
| Nút Làm mới | `bg-white border border-gray-300 rounded-lg hover:bg-gray-50` | Icon RefreshCw + text |
| Nút Xuất dữ liệu | `bg-blue-600 text-white rounded-lg hover:bg-blue-700` | Dropdown hover |
| Dropdown menu | `absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg` | CSV / JSON options |

### Chức năng
1. **Nút Làm mới**: Gọi `loadStats()` → fetch lại data từ Firebase
2. **Xuất CSV**: Gọi `exportStatsToCSV(stats)` → download file `.csv`
3. **Xuất JSON**: Gọi `exportStatsToJSON(stats)` → download file `.json`

---

## ⏰ THANH CẬP NHẬT

### UI
```
┌─────────────────────────────────────────────────────────────────┐
│  🕐  Cập nhật gần đây nhất: 03/12/2025, 10:30:45                 │
└─────────────────────────────────────────────────────────────────┘
```

### Style
- Container: `mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center`
- Icon: `Clock` từ lucide-react, `w-5 h-5 text-blue-600 mr-3`
- Text: `text-blue-700`

---

## 📑 NAVIGATION TABS

### UI
```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│  🎯 Tổng quan  │  👥 Người dùng │  📚 Quiz       │  🏆 Hiệu suất  │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

### Style
- Container: `flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto`
- Tab active: `bg-blue-600 text-white shadow-sm rounded-md`
- Tab inactive: `text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md`
- Tab padding: `px-4 md:px-6 py-3`
- Icon + Label: `flex items-center` với `Icon className="w-5 h-5 mr-2"`

### State Management
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'quizzes' | 'performance'>('overview');
```

---

## 📦 STAT CARD COMPONENT

### Thiết kế
```
┌─────────────────────────────────────┐
│  Label text                    [🔵] │
│  1,234                              │
│  Subtext (optional)                 │
│  ────────────────────────────────── │
│  📈 +5.2% so với tháng trước        │
└─────────────────────────────────────┘
```

### Props Interface
```typescript
interface StatCardProps {
  title: string;           // Label
  value: string | number;  // Giá trị chính
  icon: React.ReactNode;   // Icon từ lucide-react
  change: number;          // % thay đổi (+ hoặc -)
  color: string;           // blue, green, yellow, red, etc.
  subtext?: string;        // Text phụ (optional)
  onClick?: () => void;    // Click handler (optional)
}
```

### Style chi tiết
| Element | Class |
|---------|-------|
| Container | `bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200` |
| Title | `text-sm font-medium text-gray-600` |
| Value | `text-2xl font-bold text-gray-900 mt-1` |
| Subtext | `text-xs text-gray-500 mt-1` |
| Icon container | `p-3 rounded-full bg-{color}-100` |
| Icon | `w-6 h-6 text-{color}-600` |
| Trend up | `TrendingUp w-4 h-4 text-green-500` |
| Trend down | `TrendingDown w-4 h-4 text-red-500` |
| Change positive | `text-sm font-medium text-green-600` |
| Change negative | `text-sm font-medium text-red-600` |

---

## 📊 TAB 1: TỔNG QUAN (Overview)

### Layout Grid
```
Row 1: [Card][Card][Card][Card]     ← 4 StatCards chính (lg:grid-cols-4)
Row 2: [Card][Card][Card]           ← 3 StatCards phụ (md:grid-cols-3)
Row 3: [AreaChart    ][BarChart    ]← 2 biểu đồ (lg:grid-cols-2)
Row 4: [Box][Box][PieChart]         ← 3 boxes (lg:grid-cols-3)
Row 5: [Table - Quiz phổ biến nhất] ← Full width
Row 6: [List - Hoàn thành gần đây]  ← Full width
```

### 4 STAT CARDS CHÍNH

| # | Title | Value | Icon | Color | Subtext | onClick |
|---|-------|-------|------|-------|---------|---------|
| 1 | Tổng người dùng | `stats.totalUsers` | Users | blue | "{activeUsers} đang hoạt động" | → Tab Users |
| 2 | Quiz đã xuất bản | `stats.publishedQuizzes` | BookOpen | green | "{totalQuizzes} tổng cộng" | → Tab Quizzes |
| 3 | Lượt hoàn thành | `stats.totalCompletions` | Target | purple | "TB: {averageScore}%" | - |
| 4 | Người tạo quiz | `stats.totalCreators` | Award | orange | "{activeCreators} đang hoạt động" | - |

### 3 STAT CARDS PHỤ

| # | Title | Value | Icon | Color | Subtext |
|---|-------|-------|------|-------|---------|
| 1 | Quiz chờ duyệt | `stats.pendingQuizzes` | Clock | yellow | - |
| 2 | Tổng đánh giá | `stats.totalReviews` | MessageSquare | indigo | "TB: {averageRating} ⭐" |
| 3 | Đánh giá trung bình | `{stats.averageRating} ⭐` | Star | yellow | - |

### BIỂU ĐỒ 1: TĂNG TRƯỞNG NGƯỜI DÙNG (AreaChart)

**Vị trí**: Row 3, cột trái

**Header**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Tăng trưởng người dùng                    [7d][30d][90d][1y]   │
└─────────────────────────────────────────────────────────────────┘
```

**Time Range Filter**:
- State: `const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')`
- Button style active: `bg-blue-100 text-blue-600 px-3 py-1 text-xs rounded-full`
- Button style inactive: `bg-gray-100 text-gray-600 hover:bg-gray-200`

**Chart Config**:
```typescript
<AreaChart data={stats.userGrowthData}>
  <defs>
    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <XAxis dataKey="label" />
  <YAxis />
  <Tooltip formatter={(value) => [value.toLocaleString(), 'Người dùng']} />
  <Area 
    type="monotone" 
    dataKey="value" 
    stroke="#3B82F6" 
    fillOpacity={1} 
    fill="url(#colorUsers)" 
  />
</AreaChart>
```

**Data Format**:
```typescript
interface TimeSeriesData {
  date: string;
  label: string;  // "T1", "T2", ... hoặc "01/12", "02/12"
  value: number;  // Số người dùng
}
```

### BIỂU ĐỒ 2: HOẠT ĐỘNG QUIZ (BarChart)

**Vị trí**: Row 3, cột phải

**Chart Config**:
```typescript
<BarChart data={stats.quizActivityData}>
  <XAxis dataKey="label" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="value" fill="#10B981" name="Quiz tạo mới" />
  <Bar dataKey="value2" fill="#3B82F6" name="Lượt hoàn thành" />
</BarChart>
```

**Màu sắc**:
- Quiz tạo mới: `#10B981` (xanh lá)
- Lượt hoàn thành: `#3B82F6` (xanh dương)

### BOX 1: TỔNG QUAN HIỆU SUẤT

**Vị trí**: Row 4, cột 1

**UI**:
```
┌─────────────────────────────────────┐
│  Tổng quan hiệu suất                │
│  ─────────────────────────────────  │
│  Điểm trung bình            75.5%   │
│  ████████████░░░░░░░░              │
│                                     │
│  Tỷ lệ hoàn thành           85.0%   │
│  ██████████████░░░░░░              │
│                                     │
│  Tổng đánh giá                 42   │
│  Đánh giá TB              4.2 ⭐    │
└─────────────────────────────────────┘
```

**Progress Bar Style**:
- Background: `w-full bg-gray-200 rounded-full h-2`
- Fill: `bg-green-500 h-2 rounded-full` với `style={{ width: '75%' }}`

### BOX 2: DANH MỤC HÀNG ĐẦU

**Vị trí**: Row 4, cột 2

**UI**:
```
┌─────────────────────────────────────┐
│  Danh mục hàng đầu                  │
│  ─────────────────────────────────  │
│  🥇 Toán học                 25 quiz│
│  🥈 Tiếng Anh                18 quiz│
│  🥉 Lịch sử                  12 quiz│
│  4️⃣ Vật lý                   10 quiz│
│  5️⃣ Hóa học                   8 quiz│
└─────────────────────────────────────┘
```

**Rank Badge Style**:
- #1: `bg-yellow-100 text-yellow-700`
- #2: `bg-gray-100 text-gray-700`
- #3: `bg-orange-100 text-orange-700`
- #4+: `bg-blue-50 text-blue-700`

### BIỂU ĐỒ 3: PHÂN BỐ ĐÁNH GIÁ (PieChart - Donut)

**Vị trí**: Row 4, cột 3

**Chart Config**:
```typescript
<PieChart>
  <Pie
    data={[
      { name: '5★', value: stats.reviewsByRating[5] },
      { name: '4★', value: stats.reviewsByRating[4] },
      { name: '3★', value: stats.reviewsByRating[3] },
      { name: '2★', value: stats.reviewsByRating[2] },
      { name: '1★', value: stats.reviewsByRating[1] }
    ]}
    cx="50%"
    cy="50%"
    innerRadius={40}   // Tạo donut
    outerRadius={80}
    dataKey="value"
  >
    <Cell fill="#10B981" />  // 5★ - Xanh lá
    <Cell fill="#3B82F6" />  // 4★ - Xanh dương
    <Cell fill="#F59E0B" />  // 3★ - Vàng
    <Cell fill="#EF4444" />  // 2★ - Đỏ
    <Cell fill="#6B7280" />  // 1★ - Xám
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

### BẢNG: QUIZ PHỔ BIẾN NHẤT

**Vị trí**: Row 5, full width

**UI**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Quiz phổ biến nhất                                             │
│  ───────────────────────────────────────────────────────────── │
│  #  │ Tiêu đề          │ Danh mục  │ Lượt chơi │ Điểm TB │ Đánh giá │
│  ─────────────────────────────────────────────────────────────  │
│  🥇 │ Quiz Toán cơ bản │ Toán học  │    156    │  78%   │  4.5⭐  │
│  🥈 │ English Grammar  │ Tiếng Anh │    142    │  82%   │  4.3⭐  │
│  🥉 │ Lịch sử VN       │ Lịch sử   │    98     │  71%   │  4.1⭐  │
│  4  │ Vật lý 12        │ Vật lý    │    87     │  65%   │  3.9⭐  │
│  5  │ Hóa học hữu cơ   │ Hóa học   │    76     │  69%   │  4.0⭐  │
└─────────────────────────────────────────────────────────────────┘
```

**Table Style**:
- Header: `border-b border-gray-200`, `text-left py-3 px-4 font-medium text-gray-600`
- Row: `border-b border-gray-100 hover:bg-gray-50`
- Score color: `≥70%` → `text-green-600`, `<70%` → `text-orange-600`

### LIST: HOÀN THÀNH GẦN ĐÂY

**Vị trí**: Row 6, full width

**UI**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Hoàn thành gần đây                                             │
│  ───────────────────────────────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [N]  Nguyễn Văn A                                  85%   │  │
│  │      Quiz Toán cơ bản                          03/12/25  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [T]  Trần Thị B                                    72%   │  │
│  │      English Grammar                           03/12/25  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Avatar Style**:
- Container: `w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center`
- Letter: `text-white font-bold`

**Item Container**: `p-3 bg-gray-50 rounded-lg`

---

## 👥 TAB 2: NGƯỜI DÙNG (Users)

### Layout
```
Row 1: [Card][Card][Card][Card]     ← 4 StatCards (md:grid-cols-4)
Row 2: [PieChart - Phân bố vai trò] ← Full width
Row 3: [LineChart - Xu hướng]       ← Full width
Row 4: [Button - Quản lý người dùng]← Center
```

### 4 STAT CARDS

| # | Title | Value | Icon | Color |
|---|-------|-------|------|-------|
| 1 | Tổng người dùng | `stats.totalUsers` | Users | blue |
| 2 | Quản trị viên | `stats.usersByRole.admin` | Award | red |
| 3 | Người tạo nội dung | `stats.usersByRole.creator` | Edit | green |
| 4 | Người dùng thường | `stats.usersByRole.user` | Users | gray |

### BIỂU ĐỒ: PHÂN BỐ VAI TRÒ (PieChart)

**Chart Config**:
```typescript
<PieChart>
  <Pie
    data={[
      { name: 'Admin', value: stats.usersByRole.admin },
      { name: 'Creator', value: stats.usersByRole.creator },
      { name: 'User', value: stats.usersByRole.user }
    ]}
    cx="50%"
    cy="50%"
    outerRadius={100}
    dataKey="value"
    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  >
    <Cell fill="#EF4444" />  // Admin - Đỏ
    <Cell fill="#10B981" />  // Creator - Xanh lá
    <Cell fill="#3B82F6" />  // User - Xanh dương
  </Pie>
</PieChart>
```

### BIỂU ĐỒ: XU HƯỚNG TĂNG TRƯỞNG (LineChart)

**Chart Config**:
```typescript
<LineChart data={stats.userGrowthData}>
  <XAxis dataKey="label" />
  <YAxis />
  <Tooltip />
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="#3B82F6" 
    strokeWidth={2} 
    dot={{ fill: '#3B82F6' }} 
  />
</LineChart>
```

### NÚT QUẢN LÝ

**Style**: `px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center`
**Action**: `navigate('/admin/roles')`

---

## 📚 TAB 3: QUIZ (Quizzes)

### Layout
```
Row 1: [Card][Card][Card]           ← 3 StatCards (md:grid-cols-3)
Row 2: [PieChart][PieChart]         ← 2 PieCharts (lg:grid-cols-2)
Row 3: [Table - Quiz phổ biến]      ← Full width với nút "Xem tất cả"
```

### 3 STAT CARDS

| # | Title | Value | Icon | Color |
|---|-------|-------|------|-------|
| 1 | Tổng Quiz | `stats.totalQuizzes` | BookOpen | blue |
| 2 | Đã duyệt | `stats.publishedQuizzes` | CheckCircle | green |
| 3 | Chờ duyệt | `stats.pendingQuizzes` | Clock | yellow |

### BIỂU ĐỒ 1: QUIZ THEO DANH MỤC (PieChart)

**Vị trí**: Row 2, cột trái

**Chart Config**:
```typescript
<PieChart>
  <Pie
    data={stats.categories.slice(0, 6).map(cat => ({
      name: cat.name,
      value: cat.quizCount
    }))}
    cx="50%"
    cy="50%"
    outerRadius={100}
    dataKey="value"
    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  >
    {stats.categories.slice(0, 6).map((_, index) => (
      <Cell key={index} fill={COLORS[index % 6]} />
    ))}
  </Pie>
</PieChart>
```

**Màu sắc** (6 màu xoay vòng):
```typescript
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
```

### BIỂU ĐỒ 2: PHÂN LOẠI QUIZ (PieChart)

**Vị trí**: Row 2, cột phải

**Data**:
```typescript
const data = [
  { name: 'Quiz thường', value: stats.quizTypeStats?.normal || 0 },
  { name: 'Quiz có tài liệu', value: stats.quizTypeStats?.withResources || 0 },
  { name: 'Quiz có mật khẩu', value: stats.quizTypeStats?.withPassword || 0 }
];
```

**Màu sắc**:
- Quiz thường: `#3B82F6` (xanh dương)
- Quiz có tài liệu: `#10B981` (xanh lá)
- Quiz có mật khẩu: `#F59E0B` (vàng)

### BẢNG: QUIZ PHỔ BIẾN

**Header** (có nút):
```
┌─────────────────────────────────────────────────────────────────┐
│  Quiz phổ biến                                   [Xem tất cả]   │
└─────────────────────────────────────────────────────────────────┘
```

**Nút "Xem tất cả"**: `navigate('/admin/quiz-management')`

**Columns**:
| Column | Align | Width |
|--------|-------|-------|
| Tiêu đề | left | auto |
| Danh mục | left | auto |
| Lượt chơi | right | auto |
| Điểm TB | right | auto |
| Hành động | center | auto |

**Actions**:
- 👁 Xem trước: `navigate('/quiz/{id}/preview')`
- ✏️ Sửa: `navigate('/admin/edit-quiz/{id}')`

**Button Style**:
- Xem: `p-2 text-blue-600 hover:bg-blue-50 rounded-lg`
- Sửa: `p-2 text-green-600 hover:bg-green-50 rounded-lg`

---

## 🏆 TAB 4: HIỆU SUẤT (Performance)

### Layout
```
Row 1: [Card][Card][Card]           ← 3 StatCards (md:grid-cols-3)
Row 2: [LineChart - Hiệu suất]      ← Full width
Row 3: [BarChart][BarChart]         ← 2 BarCharts (lg:grid-cols-2)
```

### 3 STAT CARDS

| # | Title | Value | Icon | Color | Change |
|---|-------|-------|------|-------|--------|
| 1 | Điểm trung bình | `{stats.averageScore}%` | Target | green | +2.5% |
| 2 | Tỷ lệ hoàn thành | `{stats.completionRate}%` | CheckCircle | blue | +1.8% |
| 3 | Đánh giá TB | `{stats.averageRating} ⭐` | Star | yellow | +0.3% |

### BIỂU ĐỒ 1: CHỈ SỐ HIỆU SUẤT THEO THỜI GIAN (LineChart)

**Vị trí**: Row 2, full width

**Chart Config**:
```typescript
<LineChart data={stats.completionTrendData}>
  <XAxis dataKey="label" />
  <YAxis domain={[0, 100]} />
  <Tooltip />
  <Legend />
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="#10B981" 
    strokeWidth={2}
    name="Điểm TB" 
  />
  <Line 
    type="monotone" 
    dataKey="value2" 
    stroke="#3B82F6" 
    strokeWidth={2}
    name="Tỷ lệ hoàn thành" 
  />
</LineChart>
```

### BIỂU ĐỒ 2: PHÂN BỐ ĐÁNH GIÁ (BarChart ngang)

**Vị trí**: Row 3, cột trái

**Chart Config**:
```typescript
<BarChart 
  data={[
    { rating: '5★', count: stats.reviewsByRating[5] },
    { rating: '4★', count: stats.reviewsByRating[4] },
    { rating: '3★', count: stats.reviewsByRating[3] },
    { rating: '2★', count: stats.reviewsByRating[2] },
    { rating: '1★', count: stats.reviewsByRating[1] }
  ]}
  layout="vertical"
>
  <XAxis type="number" />
  <YAxis type="category" dataKey="rating" />
  <Tooltip />
  <Bar dataKey="count" fill="#3B82F6" name="Đánh giá" />
</BarChart>
```

### BIỂU ĐỒ 3: HIỆU SUẤT THEO DANH MỤC (BarChart)

**Vị trí**: Row 3, cột phải

**Chart Config**:
```typescript
<BarChart data={stats.categories.slice(0, 5)}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="quizCount" fill="#3B82F6" name="Quiz" />
  <Bar dataKey="completionCount" fill="#10B981" name="Lượt chơi" />
</BarChart>
```

---

## ⏳ LOADING STATE

**UI**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         [Spinner]                               │
│                                                                 │
│              Đang tải dữ liệu thực từ Firebase...               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Style**:
- Container: `min-h-screen bg-gray-50 flex items-center justify-center`
- Spinner: `animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600`
- Text: `mt-4 text-gray-600`

---

## 📊 DATA INTERFACES

### AdminDashboardStats
```typescript
interface AdminDashboardStats {
  // User Statistics
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  userGrowthRate: number;
  usersByRole: {
    admin: number;
    creator: number;
    user: number;
  };
  
  // Quiz Statistics
  totalQuizzes: number;
  publishedQuizzes: number;
  pendingQuizzes: number;
  draftQuizzes: number;
  newQuizzesThisMonth: number;
  newQuizzesLastMonth: number;
  quizGrowthRate: number;
  
  // Quiz Type Statistics
  quizTypeStats: {
    normal: number;
    withResources: number;
    withPassword: number;
  };
  
  // Completion Statistics
  totalCompletions: number;
  completionsThisMonth: number;
  completionsLastMonth: number;
  completionGrowthRate: number;
  averageScore: number;
  completionRate: number;
  
  // Creator Statistics
  totalCreators: number;
  activeCreators: number;
  
  // Review Statistics
  totalReviews: number;
  averageRating: number;
  reviewsByRating: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  
  // Category Statistics
  categories: CategoryStats[];
  
  // Time-based data for charts
  userGrowthData: TimeSeriesData[];
  quizActivityData: TimeSeriesData[];
  completionTrendData: TimeSeriesData[];
  
  // Top performers
  topQuizzes: TopQuiz[];
  recentCompletions: RecentCompletion[];
}

interface CategoryStats {
  id: string;
  name: string;
  quizCount: number;
  completionCount: number;
}

interface TimeSeriesData {
  date: string;
  label: string;
  value: number;
  value2?: number;
}

interface TopQuiz {
  id: string;
  title: string;
  category: string;
  completions: number;
  averageScore: number;
  rating: number;
}

interface RecentCompletion {
  id: string;
  userName: string;
  quizTitle: string;
  score: number;
  completedAt: Date;
}
```

---

## 🌐 I18N KEYS

### Tiếng Việt (vi/common.json)
```json
{
  "admin": {
    "stats": {
      "title": "Thống kê Quiz",
      "subtitle": "Dữ liệu thực từ Firebase - Cập nhật realtime",
      "totalUsers": "Tổng số người dùng",
      "activeUsers": "đang hoạt động",
      "publishedQuizzes": "Quiz đã xuất bản",
      "totalQuizzes": "tổng cộng",
      "totalCompletions": "Lượt hoàn thành",
      "avgScore": "Điểm TB",
      "totalCreators": "Tổng số Creator",
      "activeCreators": "đang hoạt động",
      "pendingQuizzes": "Chờ duyệt",
      "totalReviews": "Tổng số đánh giá",
      "avgRating": "TB",
      "averageRating": "Đánh giá trung bình",
      "userGrowth": "Tăng trưởng người dùng",
      "quizActivity": "Hoạt động Quiz",
      "createdQuizzes": "Quiz tạo mới",
      "completedAttempts": "Lượt hoàn thành",
      "performanceOverview": "Tổng quan hiệu suất",
      "averageScore": "Điểm trung bình",
      "completionRate": "Tỷ lệ hoàn thành",
      "topCategories": "Danh mục hàng đầu",
      "noCategories": "Chưa có danh mục",
      "ratingDistribution": "Phân bố đánh giá",
      "topQuizzes": "Quiz phổ biến nhất",
      "quizTitle": "Tiêu đề",
      "category": "Danh mục",
      "completions": "Lượt chơi",
      "rating": "Đánh giá",
      "noQuizzes": "Chưa có dữ liệu quiz",
      "recentCompletions": "Hoàn thành gần đây",
      "noCompletions": "Chưa có lượt hoàn thành",
      "admins": "Quản trị viên",
      "creators": "Người tạo nội dung",
      "regularUsers": "Người dùng thường",
      "userRoleDistribution": "Phân bố vai trò người dùng",
      "userGrowthTrend": "Xu hướng tăng trưởng người dùng",
      "manageUsers": "Quản lý người dùng",
      "quizByCategory": "Quiz theo danh mục",
      "quizTypeDistribution": "Phân loại Quiz",
      "normalQuiz": "Quiz thường",
      "quizWithResources": "Quiz có tài liệu",
      "quizWithPassword": "Quiz có mật khẩu",
      "actions": "Hành động",
      "preview": "Xem trước",
      "edit": "Sửa",
      "performanceMetrics": "Chỉ số hiệu suất theo thời gian",
      "categoryPerformance": "Hiệu suất theo danh mục",
      "quizzes": "Quiz",
      "users": "Người dùng",
      "reviews": "Đánh giá",
      "lastUpdated": "Cập nhật gần đây nhất"
    },
    "tabs": {
      "overview": "Tổng quan",
      "users": "Người dùng",
      "quizzes": "Quiz",
      "performance": "Hiệu suất"
    },
    "vsLastMonth": "so với tháng trước",
    "dataLoadSuccess": "Dữ liệu đã được tải thành công!",
    "realDataLoadError": "Không thể tải dữ liệu thống kê",
    "noDataToExport": "Không có dữ liệu để xuất",
    "exportSuccess": "Xuất dữ liệu thành công!",
    "exportError": "Không thể xuất dữ liệu",
    "exportData": "Xuất dữ liệu",
    "loadingRealData": "Đang tải dữ liệu thực từ Firebase..."
  },
  "refresh": "Làm mới",
  "viewAll": "Xem tất cả",
  "loading": "Đang tải..."
}
```

---

## 📱 RESPONSIVE DESIGN

### Breakpoints
| Breakpoint | Width | Grid columns |
|------------|-------|--------------|
| Default | < 768px | 1 column |
| md | ≥ 768px | 2-3 columns |
| lg | ≥ 1024px | 2-4 columns |

### Grid Classes Used
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (4 cards)
- `grid-cols-1 md:grid-cols-3` (3 cards)
- `grid-cols-1 lg:grid-cols-2` (2 charts)
- `grid-cols-1 lg:grid-cols-3` (3 boxes)

### Mobile Adjustments
- Tabs có `overflow-x-auto` để scroll ngang
- Tab padding giảm: `px-4 md:px-6`
- Charts có `ResponsiveContainer width="100%"`

---

## 🔧 DEPENDENCIES

### React Imports
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
```

### Recharts
```typescript
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
```

### Lucide Icons
```typescript
import { 
  TrendingUp, TrendingDown, Users, BookOpen, Target, Award, RefreshCw, 
  Eye, Edit, Download, CheckCircle, Clock, Star, MessageSquare
} from 'lucide-react';
```

### Service
```typescript
import { 
  fetchAdminDashboardStats, 
  exportStatsToCSV, 
  exportStatsToJSON,
  AdminDashboardStats 
} from '../../../services/adminStatsService';
```

---

## ✅ TỔNG KẾT

### Số lượng thành phần

| Loại | Số lượng |
|------|----------|
| StatCards | 14 total (across all tabs) |
| PieCharts | 4 |
| BarCharts | 3 |
| LineCharts | 2 |
| AreaCharts | 1 |
| Tables | 2 |
| Lists | 1 |
| Progress Bars | 2 |

### Tổng số dòng code: **877 dòng**

---

## 📝 GỢI Ý CẢI THIỆN (Nếu cần)

1. **Thêm filter theo thời gian** cho tất cả biểu đồ (không chỉ User Growth)
2. **Thêm skeleton loading** thay vì chỉ spinner
3. **Thêm real-time updates** với Firebase listeners
4. **Export PDF** ngoài CSV/JSON
5. **Print-friendly layout**
6. **Dark mode support**
7. **Thêm animation** cho charts khi load
8. **Thêm drill-down** từ charts → chi tiết

---

> **Báo cáo được tạo tự động từ phân tích source code**
