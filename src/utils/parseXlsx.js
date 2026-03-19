import ExcelJS from 'exceljs'
import { nextId } from '../data/defaultTemplate'

function getVal(cell) {
  const v = cell?.value
  if (v == null) return ''
  if (typeof v === 'object' && v.richText) return v.richText.map((t) => t.text).join('')
  if (v instanceof Date) return v.toLocaleDateString('ko-KR')
  return String(v)
}

function getNumStr(cell) {
  const v = cell?.value
  if (v == null || v === '') return ''
  if (typeof v === 'number') return v !== 0 ? String(v) : ''
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? '' : String(v)
}

export async function parseXlsxFile(file) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const ws = wb.worksheets[0]
  if (!ws) throw new Error('워크시트를 찾을 수 없습니다.')

  // ── 헤더 정보 추출 (rows 2-7) ─────────────────────────────────────────────
  const row2 = ws.getRow(2)
  const row3 = ws.getRow(3)
  const row4 = ws.getRow(4)
  const row5 = ws.getRow(5)
  const row6 = ws.getRow(6)
  const row7 = ws.getRow(7)

  // 공사기간 파싱
  const periodText = getVal(row2.getCell(2))
  let constructionStart = '', constructionEnd = ''
  const pm = periodText.match(/(.+?)\s*~\s*(.+?)(\s*(기간|소요)|$)/)
  if (pm) {
    constructionStart = pm[1].trim()
    constructionEnd = pm[2].trim()
  }

  // 고객 정보 블록 (A3 셀 - 날짜 + 고객명 + 인사말 포함)
  const clientBlock = getVal(row3.getCell(1))
  const clientLines = clientBlock.split('\n').map((l) => l.trim()).filter(Boolean)
  const date   = clientLines[0] || ''
  const client = (clientLines[1] || '').replace(/\s*귀하\s*$/, '').trim()

  const info = {
    date,
    client,
    constructionStart,
    constructionEnd,
    registrationNumber: getVal(row3.getCell(5)),
    companyName:        getVal(row4.getCell(5)),
    manager:            getVal(row4.getCell(7)),
    address:            getVal(row5.getCell(5)),
    industry:           getVal(row6.getCell(5)) || '건설업',
    type:               getVal(row6.getCell(7)) || '인테리어',
    phone:              getVal(row7.getCell(5)),
    fax:                getVal(row7.getCell(7)),
  }

  // ── 데이터 행 파싱 (row 10+) ──────────────────────────────────────────────
  const rows = []
  const extras = []
  let inExtras = false

  ws.eachRow((row, rowNum) => {
    if (rowNum < 10) return

    const itemText = getVal(row.getCell(1)).trim()
    if (!itemText) return

    // 별도 사항 구분선
    if (itemText.includes('별도 사항')) {
      inExtras = true
      return
    }
    // 하단 합계 행
    if (/^합\s*계/.test(itemText)) return

    if (inExtras) {
      extras.push({ id: nextId(), text: itemText })
      return
    }

    // 섹션 헤더: "1. 철거" 패턴
    if (/^\d+\.\s/.test(itemText)) {
      rows.push({
        id: nextId(), type: 'header',
        item: itemText, spec: '', qty: '', unitPrice: '', amount: '', note: '',
      })
    } else {
      rows.push({
        id: nextId(), type: 'row',
        item:      itemText,
        spec:      getVal(row.getCell(3)),
        qty:       getNumStr(row.getCell(4)),
        unitPrice: getNumStr(row.getCell(5)),
        amount:    getNumStr(row.getCell(6)),
        note:      getVal(row.getCell(7)),
      })
    }
  })

  return { info, rows, extras }
}
