import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join('\n')
    pages.push(pageText)
  }

  return pages.join('\n\n--- 페이지 구분 ---\n\n')
}

// Checklist items map: PDF keywords → quote items
const ITEM_PATTERNS = [
  // 현관
  { pattern: /디딤석/, category: '현관', item: ' - 현관 디딤석 시공' },
  { pattern: /바닥\s*타일/, category: '현관', item: ' - 현관 바닥 타일 시공' },
  { pattern: /신발장.*제작|제작.*신발장/, category: '현관', item: ' - 신발장 제작' },
  { pattern: /중문.*제작|제작.*중문/, category: '현관', item: ' - 중문 제작' },
  { pattern: /비대칭양개|비대칭\s*양개/, category: '중문', item: ' - 비대칭 양개형 중문' },
  { pattern: /3연동|삼연동/, category: '중문', item: ' - 3연동 슬라이딩 중문' },

  // 욕실
  { pattern: /전체\s*철거.*타일|타일.*전체\s*철거/, category: '욕실', item: ' - 욕실 전체 철거 (방수 1,2,3차) 및 타일 시공' },
  { pattern: /SMC\s*천장|SMC천장/, category: '욕실', item: ' : SMC 천정 / 휴젠뜨2' },
  { pattern: /젠다이/, category: '욕실', item: " : 'ㅡ'자형 젠다이 생성" },
  { pattern: /반조적.*반유리|반유리.*반조적/, category: '욕실', item: ' : 반조적 반유리 샤워파티션 생성' },
  { pattern: /샤워부스/, category: '욕실', item: ' : 샤워부스 설치' },

  // 거실
  { pattern: /아트월.*철거|철거.*아트월/, category: '거실', item: ' - 거실 아트월 철거' },
  { pattern: /우물\s*천장/, category: '거실', item: ' - 거실 우물천장 T5 간접 등박스 생성' },
  { pattern: /TV.*반매립|반매립.*TV/, category: '거실', item: ' - TV 반매립 MDF 벽체 (필름 마감)' },
  { pattern: /실링팬/, category: '거실', item: ' - 거실 실링팬 상시 전원' },
  { pattern: /시스템에어컨/, category: '전기', item: ' - 시스템 에어컨 설치' },

  // 주방
  { pattern: /주방.*씽크|씽크.*주방/, category: '주방', item: " - 'ㄱ'자형 씽크대 상부장" },
  { pattern: /홈바/, category: '주방', item: ' - 홈바 제작' },
  { pattern: /냉장고장/, category: '주방', item: ' - 냉장고장 제작' },

  // 도배
  { pattern: /집\s*전체.*도배|전체.*도배/, category: '도배', item: ' - 전체 도배 (LX 디아망)' },
  { pattern: /LX\s*디아망/, category: '도배', item: ' - 공용부 LX 디아망 도배 (벽, 천장)' },

  // 마루
  { pattern: /마루.*철거|철거.*마루/, category: '마루', item: ' - 마루 철거 및 샌딩' },
  { pattern: /구정마루/, category: '마루', item: ' - 구정마루 마뷸러스 리브' },
  { pattern: /마루.*시공|장판/, category: '마루', item: ' - 마루 시공' },
]

export function parseQuoteFromText(text) {
  const detectedItems = []
  const checkedPattern = /[√✓VvOo]/

  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    for (const { pattern, item } of ITEM_PATTERNS) {
      if (pattern.test(line)) {
        // Look nearby for check marks
        const nearbyText = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
        if (checkedPattern.test(nearbyText) || checkedPattern.test(line)) {
          if (!detectedItems.find((d) => d.item === item)) {
            detectedItems.push({ item, source: line.trim() })
          }
        }
      }
    }
  }

  return detectedItems
}

export function extractHeaderInfo(text) {
  const info = {}

  // Try to extract date
  const dateMatch = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (dateMatch) {
    info.date = `${dateMatch[1]}년 ${dateMatch[2]}월 ${dateMatch[3]}일`
  }

  // Try to extract address / client name
  const addressMatch = text.match(/창원|부산|대구|서울|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/)
  if (addressMatch) {
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.includes(addressMatch[0]) && line.length < 60) {
        info.client = line.trim()
        break
      }
    }
  }

  return info
}
