# 견적서 자동 생성기 (Auto Quote)

현장 메모를 작성하거나 파일을 업로드해 견적서를 빠르게 만들고, PDF/XLSX로 내보낼 수 있는 웹 애플리케이션입니다.

---

## 주요 기능

### 현장 메모 → 견적서 변환
- 웹 폼으로 현장 정보(주소, 방문일, 각 공종별 작업 내용)를 입력
- 작성한 메모를 자동으로 견적서 형식으로 변환
- 현장 메모 ↔ 견적서 간 자유롭게 이동 가능

### 견적서 에디터
- 항목·규격·수량·단가·금액·비고를 셀 단위로 직접 편집
- **계층형 항목 번호**: `1-1.`, `1-2-1.` 형태의 2단계 들여쓰기 지원
- 수량 × 단가 자동 계산 / 단가만 입력 시 단가를 금액으로 사용
- 섹션별 소계 자동 합산 → 상단·하단 합계에 반영
- 행 드래그로 순서 변경 / Shift+클릭으로 다중 선택
- 실행 취소(Ctrl+Z) / 다시 실행(Ctrl+Y)
- 확대·축소(50%~150%)

### 파일 입출력
- PDF 파일 드래그 앤 드롭으로 헤더 정보 자동 추출
- XLSX 파일 업로드로 기존 견적서 불러오기
- **XLSX 내보내기**: 스타일 포함, 파일명 `YYYYMMDD_고객명.xlsx`
- **PDF 출력**: A4 최적화, 브라우저 인쇄 기능 사용

### 저장 및 관리 (Supabase 연동)
- 견적서 및 현장 메모 클라우드 저장
- 자동 저장: 저장된 이후 변경 시 3초 뒤 자동 업데이트
- 현장 메모 임시 저장(Draft) 기능
- 저장 내역 관리(전체 목록 조회·삭제)

### 공급자 정보 관리
- 사업자등록번호·상호·대표자·주소 등 공급자 정보 저장
- 새 견적서 작성 시 자동 반영

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 프레임워크 | React 19 + Vite |
| 백엔드 / DB | Supabase (PostgreSQL + Auth) |
| Excel 처리 | ExcelJS |
| PDF 파싱 | pdfjs-dist |
| 스타일 | 순수 CSS |

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하세요.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key-here
```

### 3. Supabase 테이블 설정

Supabase 대시보드 → SQL Editor에서 아래 SQL을 순서대로 실행합니다.

```sql
-- 견적서 테이블
CREATE TABLE public.quotes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client     TEXT,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 현장 메모 테이블
CREATE TABLE public.memos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address    TEXT,
  status     TEXT DEFAULT 'completed',
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공급자 설정 테이블
CREATE TABLE public.settings (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.quotes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 접근 허용
CREATE POLICY "authenticated only" ON public.quotes  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated only" ON public.memos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated only" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memos    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
```

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 빌드

```bash
npm run build
```

---

## 에디터 단축키

| 단축키 | 동작 |
|--------|------|
| ↑ / ↓ / ← / → | 인접 셀로 이동 |
| Enter | 아래 셀로 이동 |
| Shift + Enter | 셀 내 개행 |
| Tab | 품목 하위 단계로 (1-1 → 1-1-1) |
| Shift + Tab | 품목 상위 단계로 (1-1-1 → 1-1) |
| Ctrl + Z | 실행 취소 |
| Ctrl + Y | 다시 실행 |

---

## 프로젝트 구조

```
src/
├── components/
│   ├── QuoteEditor.jsx   # 견적서 편집기 (메인)
│   ├── MemoForm.jsx      # 현장 메모 입력 폼
│   ├── UploadZone.jsx    # 파일 업로드 / 최근 항목
│   ├── LoginPage.jsx     # 로그인
│   ├── SupplierModal.jsx # 공급자 정보 관리
│   └── StoragePanel.jsx  # 저장 내역 관리
├── data/
│   ├── defaultTemplate.js  # 기본 견적서 템플릿
│   └── memoFormConfig.js   # 현장 메모 폼 설정
├── lib/
│   ├── supabase.js  # Supabase 클라이언트
│   └── db.js        # DB CRUD 함수
├── utils/
│   ├── exportXlsx.js  # XLSX 내보내기
│   ├── formToQuote.js # 메모 → 견적서 변환
│   ├── parseXlsx.js   # XLSX 불러오기
│   └── pdfParser.js   # PDF 텍스트 추출
└── App.jsx  # 최상위 컴포넌트 / 라우팅
```
