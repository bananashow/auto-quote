import ExcelJS from 'exceljs'

// ── Style helpers ─────────────────────────────────────────────────────────────
const ft = (opts = {}) => ({ name: '맑은 고딕', size: 9, ...opts })
const al = (h = 'left', v = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap })
const fl = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

const brd = (color = 'FF999999', style = 'thin') => ({ style, color: { argb: color } })
const brdAll  = (c = 'FF999999', s = 'thin')  => ({ top: brd(c, s), bottom: brd(c, s), left: brd(c, s), right: brd(c, s) })
const brdLight = () => brdAll('FFD1D5DB', 'thin')
const brdMed   = () => brdAll('FF555555', 'medium')

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseNum(val) {
  const n = parseFloat(String(val ?? '').replace(/,/g, ''))
  return !val || isNaN(n) ? null : n
}

function getFileName(info) {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const client = (info.client || '견적서')
    .replace(/[/\\?%*:|"<>]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  return `${date}_${client}.xlsx`
}

export async function exportToXlsx(info, rows, extras) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Auto Quote'
  const ws = wb.addWorksheet('견적서')

  // Column widths: A, B(품목 merged), C(규격), D(수량), E(단가), F(금액), G(비고)
  ws.columns = [
    { width: 36 }, // A
    { width: 4  }, // B
    { width: 10 }, // C
    { width: 8  }, // D
    { width: 14 }, // E
    { width: 14 }, // F
    { width: 24 }, // G
  ]

  const sc = (r, c, value, styles = {}) => {
    const ce = ws.getCell(r, c)
    ce.value = value
    if (styles.font)      ce.font      = styles.font
    if (styles.fill)      ce.fill      = styles.fill
    if (styles.alignment) ce.alignment = styles.alignment
    if (styles.border)    ce.border    = styles.border
    if (styles.numFmt)    ce.numFmt    = styles.numFmt
    return ce
  }
  const mg = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2)

  // ── Row 1: Title ─────────────────────────────────────────────────────────────
  mg(1, 1, 1, 7)
  sc(1, 1, '견   적   서', {
    font: ft({ size: 22, bold: true }),
    alignment: al('center', 'middle'),
  })
  ws.getRow(1).height = 44

  // ── Row 2: Construction period ────────────────────────────────────────────────
  sc(2, 1, '공사기간  :', { font: ft() })
  mg(2, 2, 2, 7)
  const period = info.constructionStart
    ? `${info.constructionStart} ~ ${info.constructionEnd}`
    : '        일  ~        일  기간 소요'
  sc(2, 2, period, { font: ft(), alignment: al() })
  ws.getRow(2).height = 16

  // ── Rows 3-7: Client block (left) + Supplier table (right) ───────────────────
  for (let r = 3; r <= 7; r++) ws.getRow(r).height = 18

  // A3:B7 – client info
  mg(3, 1, 7, 2)
  sc(3, 1, `${info.date || ''}\n\n${info.client ? info.client + ' 귀하' : ''}\n\n아래와 같이 견적합니다.`, {
    font: ft({ size: 10 }),
    alignment: al('left', 'top', true),
    border: brdMed(),
  })

  // C3:C7 – "공급자" label
  mg(3, 3, 7, 3)
  sc(3, 3, '공\n급\n자', {
    font: ft({ bold: true, size: 10 }),
    alignment: al('center', 'middle', false),
    fill: fl('FFF1F5F9'),
    border: brdAll(),
  })

  // Supplier table helpers
  const sTH = (r, c, val, mc) => {
    if (mc) mg(r, c, r, mc)
    sc(r, c, val, {
      font: ft({ bold: true, size: 8.5 }),
      alignment: al('center', 'middle', true),
      fill: fl('FFF8FAFC'),
      border: brdAll(),
    })
  }
  const sTD = (r, c, val, mc) => {
    if (mc) mg(r, c, r, mc)
    sc(r, c, val, {
      font: ft({ size: 9 }),
      alignment: al('left', 'middle'),
      border: brdAll(),
    })
  }

  sTH(3, 4, '등록번호');     sTD(3, 5, info.registrationNumber || '', 7)
  sTH(4, 4, '상호명\n(법인명)'); sTD(4, 5, info.companyName || ''); sTH(4, 6, '담당자'); sTD(4, 7, info.manager || '')
  sTH(5, 4, '주소');          sTD(5, 5, info.address || '', 7)
  sTH(6, 4, '업태');          sTD(6, 5, info.industry || ''); sTH(6, 6, '종목'); sTD(6, 7, info.type || '')
  sTH(7, 4, '전화번호');      sTD(7, 5, info.phone || '');    sTH(7, 6, '팩스'); sTD(7, 7, info.fax || '')

  // ── Row 8: Total bar ──────────────────────────────────────────────────────────
  const total = rows.reduce((sum, row) => {
    if (row.type === 'row') return sum + (parseNum(row.amount) || 0)
    return sum
  }, 0)

  mg(8, 1, 8, 2)
  sc(8, 1, '합 계 금 액', {
    font: ft({ bold: true, size: 11 }),
    alignment: al('center', 'middle'),
    fill: fl('FFEFF6FF'),
    border: brdMed(),
  })
  mg(8, 3, 8, 6)
  sc(8, 3, total, {
    font: ft({ bold: true, size: 13, color: { argb: 'FF2563EB' } }),
    alignment: al('right', 'middle'),
    numFmt: '#,##0',
    fill: fl('FFEFF6FF'),
    border: brdMed(),
  })
  sc(8, 7, '(VAT 별도)', {
    font: ft({ size: 8, color: { argb: 'FF888888' } }),
    alignment: al('center', 'middle'),
    fill: fl('FFEFF6FF'),
    border: brdMed(),
  })
  ws.getRow(8).height = 22

  // ── Row 9: Column header ──────────────────────────────────────────────────────
  const colHdr = {
    font: ft({ bold: true, color: { argb: 'FFFFFFFF' } }),
    fill: fl('FF1A1A1A'),
    alignment: al('center', 'middle'),
    border: brdAll(),
  }
  mg(9, 1, 9, 2)
  sc(9, 1, '품목', colHdr)
  ;['규격', '수량', '단가', '금액', '비고'].forEach((label, i) => sc(9, 3 + i, label, colHdr))
  ws.getRow(9).height = 18

  // ── Data rows ─────────────────────────────────────────────────────────────────
  // 행 번호 사전 계산 (1-1., 1-2., 1-2-1. 형식)
  const xlsxNums = (() => {
    const nums = {}
    let hNum = 0, l1 = 0, l2 = 0
    rows.forEach((row, i) => {
      if (row.type === 'header') {
        const m = (row.item || '').match(/^(\d+)\./)
        hNum = m ? parseInt(m[1]) : hNum + 1
        l1 = 0; l2 = 0
      } else {
        const lv = row.level ?? ((/^\s*[:-]?\s*:/.test(row.item || '')) ? 2 : 1)
        if (lv === 1) { l1++; l2 = 0; nums[i] = `${hNum}-${l1}.` }
        else          { l2++;          nums[i] = `${hNum}-${l1}-${l2}.` }
      }
    })
    return nums
  })()

  let rn = 10
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    if (row.type === 'header') {
      mg(rn, 1, rn, 7)
      sc(rn, 1, row.item || '', {
        font: ft({ bold: true, size: 9.5 }),
        fill: fl('FFF0F0F0'),
        alignment: al('left', 'middle'),
        border: brdAll('FFAAAAAA'),
      })
      ws.getRow(rn).height = 16
    } else {
      const level  = row.level ?? ((/^\s*[:-]?\s*:/.test(row.item || '')) ? 2 : 1)
      const num    = xlsxNums[ri] || ''
      const clean  = (row.item || '').replace(/^\s*-\s+/, '').replace(/^\s*:\s*/, '')
      const indent = level === 2 ? '  ' : ''
      const base  = { font: ft(),        alignment: al('left',  'middle', true), border: brdLight() }
      const numSt = { font: ft(),        alignment: al('right', 'middle'),       border: brdLight(), numFmt: '#,##0' }
      const amtVal = parseNum(row.amount)

      mg(rn, 1, rn, 2)
      sc(rn, 1, `${indent}${num} ${clean}`, {
        ...base,
        font: ft({ size: level === 2 ? 8.5 : 9, color: { argb: level === 2 ? 'FF6B7280' : 'FF1F2937' } }),
      })
      sc(rn, 3, row.spec  || '', { ...base, alignment: al('center', 'middle') })
      sc(rn, 4, parseNum(row.qty),       numSt)
      sc(rn, 5, parseNum(row.unitPrice), numSt)
      sc(rn, 6, amtVal, {
        ...numSt,
        font: ft({ bold: !!amtVal, color: { argb: amtVal ? 'FF1A1A1A' : 'FFBBBbbb' } }),
      })
      sc(rn, 7, row.note || '', { ...base, alignment: al('left', 'middle', true) })

      const lines = (row.item || '').split('\n').length
      ws.getRow(rn).height = Math.max(15, lines * 14)
    }
    rn++
  }

  // ── Extras / 별도 사항 ────────────────────────────────────────────────────────
  rn++
  mg(rn, 1, rn, 7)
  sc(rn, 1, '★★  별도 사항  ★★', {
    font: ft({ bold: true }),
    fill: fl('FFFFF9C4'),
    alignment: al('center', 'middle'),
    border: brdAll('FFAAA000', 'medium'),
  })
  ws.getRow(rn).height = 16
  rn++

  for (const ex of extras) {
    mg(rn, 1, rn, 7)
    sc(rn, 1, ex.text || '', {
      font: ft(),
      alignment: al('left', 'middle'),
      border: brdLight(),
    })
    ws.getRow(rn).height = 15
    rn++
  }

  // ── Footer total ──────────────────────────────────────────────────────────────
  rn++
  mg(rn, 1, rn, 5)
  sc(rn, 1, '합    계', {
    font: ft({ bold: true, size: 11, color: { argb: 'FFFFFFFF' } }),
    alignment: al('center', 'middle'),
    fill: fl('FF1A1A1A'),
    border: brdMed(),
  })
  sc(rn, 6, total, {
    font: ft({ bold: true, size: 12 }),
    alignment: al('right', 'middle'),
    numFmt: '#,##0',
    border: brdMed(),
  })
  sc(rn, 7, '* VAT 별도', {
    font: ft({ size: 8, color: { argb: 'FF888888' } }),
    alignment: al('right', 'middle'),
    border: brdMed(),
  })
  ws.getRow(rn).height = 22

  // ── Download ──────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(info)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
