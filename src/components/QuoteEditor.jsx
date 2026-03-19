import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { nextId, renumberHeaders } from '../data/defaultTemplate'
import { exportToXlsx } from '../utils/exportXlsx'
import { saveQuote } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'
import SupplierModal from './SupplierModal'

function parseNum(val) {
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

// 구버전 텍스트 접두사( - , : ) 기반 레벨 감지 + 신버전 level 필드 지원
function getRowLevel(row) {
  if (row.level != null) return row.level
  const t = row.item || ''
  if (/^\s*[:-]?\s*:/.test(t)) return 2   // ': ', ' : ' → 2단계
  return 1
}

// 구버전 텍스트 접두사 제거 (새 데이터는 이미 깨끗함)
function stripPrefix(text) {
  return text
    .replace(/^\s*-\s+/, '')   //  - foo  →  foo
    .replace(/^\s*:\s*/, '')   //  : foo  →  foo
}

function calcAmount(qty, unitPrice) {
  const q = parseNum(qty)
  const u = parseNum(unitPrice)
  return q && u ? q * u : 0
}

// setTimeout으로 포커스를 현재 이벤트 루프 이후에 처리 → 한글 IME 조합 완료 후 이동
function focusCell(el, selectAll = false) {
  if (!el) return
  setTimeout(() => {
    el.focus()
    if (selectAll) {
      el.select()
    } else if (el.tagName === 'TEXTAREA') {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, 0)
}

// Navigate to an adjacent cell by data-row / data-col attributes
function navigateCell(rowIdx, colIdx, dir) {
  if (dir === 'up' || dir === 'down') {
    const delta = dir === 'up' ? -1 : 1
    let r = rowIdx + delta
    while (r >= 0) {
      let t = document.querySelector(`[data-row="${r}"][data-col="${colIdx}"]`)
      if (!t) t = document.querySelector(`[data-row="${r}"][data-col="0"]`)
      if (t) { focusCell(t); return }
      if (!document.querySelector(`[data-row="${r}"]`)) break
      r += delta
    }
  } else if (dir === 'left') {
    if (colIdx > 0) {
      const t = document.querySelector(`[data-row="${rowIdx}"][data-col="${colIdx - 1}"]`)
      focusCell(t, true)
    } else {
      let r = rowIdx - 1
      while (r >= 0) {
        for (let c = 5; c >= 0; c--) {
          const t = document.querySelector(`[data-row="${r}"][data-col="${c}"]`)
          if (t) { focusCell(t, true); return }
        }
        r--
      }
    }
  } else if (dir === 'right') {
    const t = document.querySelector(`[data-row="${rowIdx}"][data-col="${colIdx + 1}"]`)
    if (t) {
      setTimeout(() => { t.focus(); t.setSelectionRange(0, 0) }, 0)
    } else {
      let r = rowIdx + 1
      while (true) {
        const t2 = document.querySelector(`[data-row="${r}"][data-col="0"]`)
        if (t2) { focusCell(t2, true); return }
        if (!document.querySelector(`[data-row="${r}"]`)) break
        r++
      }
    }
  }
}

function fmtComma(val) {
  const n = parseFloat(String(val).replace(/,/g, ''))
  if (isNaN(n)) return val
  return n.toLocaleString('ko-KR')
}

function EditableCell({ value, onChange, align, className, placeholder, rowIdx, colIdx, multiline, onTab, numeric }) {
  const taRef = useRef(null)

  useLayoutEffect(() => {
    if (!multiline || !taRef.current) return
    // 인쇄 모드에서는 JS 높이 지정을 제거해 CSS auto가 동작하도록
    if (window.matchMedia('print').matches) {
      taRef.current.style.height = ''
      return
    }
    taRef.current.style.height = 'auto'
    taRef.current.style.height = `${taRef.current.scrollHeight}px`
  }, [value, multiline])

  // 인쇄 전: 전체 내용이 보이도록 scrollHeight 확장 / 후: 원상복구
  useEffect(() => {
    if (!multiline) return
    const beforePrint = () => {
      if (!taRef.current) return
      taRef.current.style.height = 'auto'
      taRef.current.style.height = `${taRef.current.scrollHeight}px`
    }
    const afterPrint = () => {
      if (!taRef.current) return
      taRef.current.style.height = 'auto'
      taRef.current.style.height = `${taRef.current.scrollHeight}px`
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint',  afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint',  afterPrint)
    }
  }, [multiline])

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return

    // Tab 으로 들여쓰기 단계 변경 (품목 셀에서만)
    if (e.key === 'Tab' && onTab) {
      e.preventDefault()
      onTab(e.shiftKey)
      return
    }

    const { key, target, shiftKey } = e

    if (key === 'Enter' && multiline) {
      if (shiftKey) return
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'down')
      return
    }

    const atStart = target.selectionStart === 0 && target.selectionEnd === 0
    const atEnd = target.selectionStart === target.value.length && target.selectionEnd === target.value.length

    if (key === 'ArrowUp') {
      if (multiline && !atStart) return
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'up')
    } else if (key === 'ArrowDown') {
      if (multiline && !atEnd) return
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'down')
    } else if (key === 'ArrowLeft' && atStart) {
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'left')
    } else if (key === 'ArrowRight' && atEnd) {
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'right')
    } else if (key === 'Enter' && !multiline) {
      e.preventDefault()
      navigateCell(rowIdx, colIdx, 'down')
    }
  }

  const handleNumericBlur = (e) => {
    if (!numeric) return
    const raw = e.target.value.trim()
    if (!raw) return
    const formatted = fmtComma(raw)
    if (formatted !== raw) onChange(formatted)
  }

  const commonProps = {
    'data-row': rowIdx,
    'data-col': colIdx,
    className: `cell-input ${className || ''} ${align === 'right' ? 'text-right' : ''} ${multiline ? 'cell-textarea' : ''}`,
    value,
    placeholder: placeholder || '',
    onChange: (e) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: numeric ? handleNumericBlur : undefined,
    inputMode: numeric ? 'numeric' : undefined,
  }

  if (multiline) {
    return <textarea ref={taRef} rows={1} {...commonProps} />
  }
  return <input {...commonProps} />
}

function ShortcutRow({ keys, desc, join = '' }) {
  return (
    <div className="shortcut-row">
      <span className="shortcut-keys">
        {keys.map((k, i) => (
          <span key={i}>
            {i > 0 && <span className="shortcut-join">{join || ''}</span>}
            <kbd className="shortcut-key">{k}</kbd>
          </span>
        ))}
      </span>
      <span className="shortcut-desc">{desc}</span>
    </div>
  )
}

const DragHandle = ({ onClick, isSelected }) => (
  <span
    className={`drag-handle no-print${isSelected ? ' handle-selected' : ''}`}
    title="드래그: 이동  |  클릭: 선택  |  Shift+클릭: 범위 선택"
    onClick={onClick}
    onMouseDown={(e) => e.stopPropagation()}
  >
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
      <circle cx="3.5" cy="2.5" r="1.5" /><circle cx="8.5" cy="2.5" r="1.5" />
      <circle cx="3.5" cy="7" r="1.5" /><circle cx="8.5" cy="7" r="1.5" />
      <circle cx="3.5" cy="11.5" r="1.5" /><circle cx="8.5" cy="11.5" r="1.5" />
    </svg>
  </span>
)

function QuoteRow({
  row, effRow, index, rowNumber, onUpdate, onDelete, onAddAfter,
  onDragStart, onDragOver, onDrop, onDragEnd,
  dragOverPos, isSelected, onHandleClick,
}) {
  const handleChange = (field, value) => {
    const updated = { ...row, [field]: value }
    // qty 또는 unitPrice 변경 시 amount 를 초기화해서 effectiveRows 가 다시 계산하게 함
    if (field === 'qty' || field === 'unitPrice') {
      updated.amount = ''   // effectiveRows 에서 auto-compute
    }
    onUpdate(index, updated)
  }

  const dragProps = {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.effectAllowed = 'move'
      onDragStart(index)
    },
    onDragOver: (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const rect = e.currentTarget.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      onDragOver(index, e.clientY < mid ? 'before' : 'after')
    },
    onDrop: (e) => {
      e.preventDefault()
      onDrop(index)
    },
    onDragEnd,
  }

  const dropClass = dragOverPos === 'before'
    ? 'drop-before'
    : dragOverPos === 'after'
    ? 'drop-after'
    : ''

  const selectedClass = isSelected ? 'row-selected' : ''

  if (row.type === 'header') {
    const subtotal = effRow?._subtotal ?? 0
    const headerEmpty = !row.item?.trim()
    return (
      <tr className={`row-header ${dropClass} ${selectedClass}`} {...dragProps}>
        <td colSpan={4} className={headerEmpty ? 'cell-empty-warn' : ''}>
          <div className="row-header-inner">
            <DragHandle onClick={(e) => onHandleClick(e, index)} isSelected={isSelected} />
            <EditableCell
              value={row.item}
              onChange={(v) => onUpdate(index, { ...row, item: v })}
              className="cell-header"
              rowIdx={index}
              colIdx={0}
              multiline
            />
            <div className="row-actions no-print">
              <button className="row-btn" title="행 추가" onClick={() => onAddAfter(index)}>+</button>
              <button className="row-btn row-btn-del" title="삭제" onClick={() => onDelete(index)}>×</button>
            </div>
          </div>
        </td>
        <td className="cell-amount header-subtotal">
          {subtotal > 0 ? subtotal.toLocaleString('ko-KR') : ''}
        </td>
        <td className="cell-note" />
      </tr>
    )
  }

  const level      = getRowLevel(row)
  const cleanText  = row.level != null ? row.item : stripPrefix(row.item)

  // Tab: 1→2, Shift+Tab: 2→1
  const handleTabLevel = (shiftKey) => {
    const next = shiftKey ? Math.max(1, level - 1) : Math.min(2, level + 1)
    onUpdate(index, { ...row, item: cleanText, level: next })
  }

  const itemEmpty = !cleanText?.trim()

  return (
    <tr className={`row-item row-level-${level} ${dropClass} ${selectedClass}`} {...dragProps}>
      <td className={`cell-item${itemEmpty ? ' cell-empty-warn' : ''}`}>
        <div className="cell-item-inner">
          <DragHandle onClick={(e) => onHandleClick(e, index)} isSelected={isSelected} />
          <div className={`item-num-wrap level-${level}`}>
            <span className="row-num-label" aria-hidden="true">{rowNumber}</span>
            <EditableCell
              value={cleanText}
              onChange={(v) => onUpdate(index, { ...row, item: v, level })}
              placeholder="품목명"
              rowIdx={index}
              colIdx={0}
              multiline
              onTab={handleTabLevel}
            />
          </div>
          <div className="row-actions no-print">
            <button className="row-btn" title="행 추가" onClick={() => onAddAfter(index)}>+</button>
            <button className="row-btn row-btn-del" title="삭제" onClick={() => onDelete(index)}>×</button>
          </div>
        </div>
      </td>
      <td className="cell-spec">
        <EditableCell value={row.spec} onChange={(v) => handleChange('spec', v)} placeholder="-" rowIdx={index} colIdx={1} multiline />
      </td>
      <td className="cell-qty">
        <EditableCell value={row.qty} onChange={(v) => handleChange('qty', v)} align="right" placeholder="-" rowIdx={index} colIdx={2} />
      </td>
      <td className="cell-price">
        <EditableCell
          value={row.unitPrice}
          onChange={(v) => handleChange('unitPrice', v)}
          align="right"
          placeholder="-"
          rowIdx={index}
          colIdx={3}
          numeric
        />
      </td>
      <td className={`cell-amount${effRow?._computed ? ' cell-amount-auto' : ''}`}>
        {effRow?._computed ? (
          <span className="cell-amount-computed">
            {effRow.amount}
          </span>
        ) : (
          <EditableCell
            value={row.amount}
            onChange={(v) => handleChange('amount', v)}
            align="right"
            placeholder="-"
            rowIdx={index}
            colIdx={4}
            numeric
          />
        )}
      </td>
      <td className="cell-note">
        <EditableCell value={row.note} onChange={(v) => handleChange('note', v)} placeholder="-" rowIdx={index} colIdx={5} multiline />
      </td>
    </tr>
  )
}

export default function QuoteEditor({ data, onChange, onReset, onSignOut, supplier, onSupplierChange, onGoToMemo }) {
  const { info, rows, extras } = data

  // ── 실행 취소 / 다시 실행 ────────────────────────────────────────────────────
  const histRef    = useRef(null)   // [{info, rows, extras}, ...]
  const histIdx    = useRef(0)
  const debTimer   = useRef(null)
  const [histTick, setHistTick] = useState(0)   // 버튼 활성화 갱신용

  // 최초 마운트 시 히스토리 초기화
  if (histRef.current === null) {
    histRef.current = [{ info: data.info, rows: data.rows, extras: data.extras }]
  }

  const canUndo = histIdx.current > 0
  const canRedo = histIdx.current < histRef.current.length - 1

  const _commitSnap = useCallback((snap) => {
    const hist = histRef.current
    hist.splice(histIdx.current + 1)        // 앞 방향 히스토리 제거
    hist.push(snap)
    if (hist.length > 60) hist.shift()      // 최대 60단계 보관
    histIdx.current = hist.length - 1
    setHistTick((n) => n + 1)
  }, [])

  // 즉시 기록 (구조 변경: 행 추가·삭제·드래그)
  const pushHistory = useCallback((snap) => {
    clearTimeout(debTimer.current)
    _commitSnap(snap)
  }, [_commitSnap])

  // 디바운스 기록 (연속 타이핑)
  const pushHistoryDebounced = useCallback((snap) => {
    clearTimeout(debTimer.current)
    debTimer.current = setTimeout(() => _commitSnap(snap), 500)
  }, [_commitSnap])

  const undo = useCallback(() => {
    if (histIdx.current <= 0) return
    histIdx.current--
    const snap = histRef.current[histIdx.current]
    onChange((prev) => ({ ...prev, info: snap.info, rows: snap.rows, extras: snap.extras }))
    setHistTick((n) => n + 1)
  }, [onChange])

  const redo = useCallback(() => {
    if (histIdx.current >= histRef.current.length - 1) return
    histIdx.current++
    const snap = histRef.current[histIdx.current]
    onChange((prev) => ({ ...prev, info: snap.info, rows: snap.rows, extras: snap.extras }))
    setHistTick((n) => n + 1)
  }, [onChange])

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z 단축키
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // supplier modal
  const [showSupplier, setShowSupplier] = useState(false)

  const handleSupplierSave = (newSupplier) => {
    onSupplierChange?.(newSupplier)
    // 현재 견적서 info에도 즉시 반영
    onChange((prev) => ({ ...prev, info: { ...prev.info, ...newSupplier } }))
  }

  // current supplier = saved settings → fallback to current info fields
  const currentSupplier = supplier ?? {
    companyName:        info.companyName        || '',
    registrationNumber: info.registrationNumber || '',
    manager:            info.manager            || '',
    address:            info.address            || '',
    industry:           info.industry           || '건설업',
    type:               info.type               || '인테리어',
    phone:              info.phone              || '',
    fax:                info.fax                || '',
  }

  // cloud save state
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState('')
  const autoSaveTimer = useRef(null)
  const saveMsgTimer  = useRef(null)

  const doSave = useCallback(async (snapshot) => {
    setSaving(true)
    try {
      const id = await saveQuote(snapshot)
      onChange((prev) => ({ ...prev, supabaseId: id }))
      clearTimeout(saveMsgTimer.current)
      setSaveMsg('저장됨 ✓')
      saveMsgTimer.current = setTimeout(() => setSaveMsg(''), 2500)
    } catch (e) {
      console.error(e)
      setSaveMsg('저장 실패')
      saveMsgTimer.current = setTimeout(() => setSaveMsg(''), 2500)
    } finally {
      setSaving(false)
    }
  }, [onChange])

  const handleCloudSave = () => {
    clearTimeout(autoSaveTimer.current)
    const snapshot = { info, rows, extras, supabaseId: data.supabaseId }
    doSave(snapshot)
  }

  // 마운트/재마운트마다 플래그를 리셋해 초기 데이터로 자동 저장 방지
  // (React StrictMode의 mount → unmount → remount 사이클에서도 안전)
  const autoSaveMounted = useRef(false)
  useEffect(() => {
    autoSaveMounted.current = false          // 매 (재)마운트 시 리셋
    return () => { autoSaveMounted.current = false }
  }, [])

  useEffect(() => {
    if (!autoSaveMounted.current) { autoSaveMounted.current = true; return }
    if (!isSupabaseReady || !data.supabaseId) return
    const snapshot = { info, rows, extras, supabaseId: data.supabaseId }
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(snapshot), 3000)
    return () => clearTimeout(autoSaveTimer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, rows, extras, data.supabaseId])

  // drag state
  const dragFrom = useRef(null)
  const [dragOver, setDragOver] = useState(null) // { index, pos }

  // multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const anchorIdxRef = useRef(null)

  const handleHandleClick = useCallback((e, index) => {
    e.stopPropagation()
    const id = rows[index].id
    if (e.shiftKey && anchorIdxRef.current !== null) {
      // Shift+클릭: anchor ~ current 범위 선택
      const from = Math.min(anchorIdxRef.current, index)
      const to   = Math.max(anchorIdxRef.current, index)
      const next = new Set()
      for (let i = from; i <= to; i++) next.add(rows[i].id)
      setSelectedIds(next)
    } else {
      // 단순 클릭: 이 행만 선택 (이미 단독 선택이면 해제)
      const next = selectedIds.size === 1 && selectedIds.has(id)
        ? new Set()
        : new Set([id])
      setSelectedIds(next)
      anchorIdxRef.current = next.size ? index : null
    }
  }, [rows, selectedIds])

  // zoom state (50–150%)
  const [zoom, setZoom] = useState(100)
  const changeZoom = useCallback((delta) => {
    setZoom((z) => Math.min(150, Math.max(50, z + delta)))
  }, [])

  // shortcut guide
  const [showShortcuts, setShowShortcuts] = useState(false)

  const setInfo = useCallback((field, value) => {
    const newInfo = { ...info, [field]: value }
    onChange({ ...data, info: newInfo })
    pushHistoryDebounced({ info: newInfo, rows, extras })
  }, [data, info, rows, extras, onChange, pushHistoryDebounced])

  // immediate=true 이면 즉시 히스토리 기록 (구조 변경)
  const setRows = useCallback((newRows, immediate = false) => {
    onChange({ ...data, rows: newRows })
    const snap = { info, rows: newRows, extras }
    if (immediate) pushHistory(snap)
    else pushHistoryDebounced(snap)
  }, [data, info, extras, onChange, pushHistory, pushHistoryDebounced])

  const setExtras = useCallback((newExtras, immediate = false) => {
    onChange({ ...data, extras: newExtras })
    const snap = { info, rows, extras: newExtras }
    if (immediate) pushHistory(snap)
    else pushHistoryDebounced(snap)
  }, [data, info, rows, onChange, pushHistory, pushHistoryDebounced])

  const updateRow = (index, updated) => {
    const newRows = [...rows]
    newRows[index] = updated
    setRows(newRows)   // 타이핑 → 디바운스
  }

  const deleteRow = (index) => {
    setRows(renumberHeaders(rows.filter((_, i) => i !== index)), true)  // 즉시
  }

  const handleDragStart = useCallback((index) => {
    dragFrom.current = index
    // 선택되지 않은 행을 드래그하면 선택 초기화
    if (!selectedIds.has(rows[index]?.id)) {
      setSelectedIds(new Set())
      anchorIdxRef.current = null
    }
  }, [rows, selectedIds])

  const handleDragOver = useCallback((index, pos) => {
    if (dragFrom.current === null) return
    setDragOver({ index, pos })
  }, [])

  const handleDrop = useCallback((toIndex) => {
    const from = dragFrom.current
    if (from === null) { dragFrom.current = null; setDragOver(null); return }

    const pos = dragOver?.pos ?? 'after'

    // 드래그 시작한 행이 선택 목록에 있으면 선택된 행 전부 이동, 아니면 단독 이동
    const movingIds = selectedIds.has(rows[from]?.id) && selectedIds.size > 1
      ? new Set(selectedIds)
      : new Set([rows[from]?.id].filter(Boolean))

    const moving   = rows.filter((r) => movingIds.has(r.id))
    const remaining = rows.filter((r) => !movingIds.has(r.id))

    // 드롭 대상이 선택된 행이면 인접한 비선택 행을 기준으로 삽입 위치 결정
    let refRow = rows[toIndex]
    if (movingIds.has(refRow?.id)) {
      const dir = pos === 'after' ? 1 : -1
      for (let i = toIndex + dir; i >= 0 && i < rows.length; i += dir) {
        if (!movingIds.has(rows[i].id)) { refRow = rows[i]; break }
      }
    }

    let insertAt
    if (refRow && !movingIds.has(refRow.id)) {
      const refIdx = remaining.findIndex((r) => r.id === refRow.id)
      insertAt = pos === 'after' ? refIdx + 1 : refIdx
    } else {
      insertAt = pos === 'after' ? remaining.length : 0
    }

    const newRows = [...remaining]
    newRows.splice(insertAt, 0, ...moving)

    setRows(renumberHeaders(newRows), true)   // 드래그 완료 → 즉시
    setSelectedIds(new Set())
    anchorIdxRef.current = null
    dragFrom.current = null
    setDragOver(null)
  }, [rows, dragOver, selectedIds, setRows])

  const handleDragEnd = useCallback(() => {
    dragFrom.current = null
    setDragOver(null)
  }, [])

  const addRowAfter = (index) => {
    const clicked = rows[index]
    const clickedLevel = clicked?.type === 'header' ? 0 : getRowLevel(clicked ?? {})

    // 새 행 레벨: 헤더 → 1단계, 1단계 → 2단계, 2단계 → 2단계 유지
    const newLevel = clickedLevel === 0 ? 1 : clickedLevel === 1 ? 2 : 2

    // 삽입 위치: 클릭 행의 자식 행 끝 다음
    let insertAt = index + 1
    for (let i = index + 1; i < rows.length; i++) {
      const r = rows[i]
      if (r.type === 'header') break                  // 다음 섹션 = 중단
      const lv = getRowLevel(r)
      if (clickedLevel === 0) {
        insertAt = i + 1                               // 헤더: 섹션 끝까지
      } else if (clickedLevel === 1 && lv >= 2) {
        insertAt = i + 1                               // 1단계: 하위 2단계 끝까지
      } else {
        break                                          // 같은 레벨 만나면 중단
      }
    }

    const newRow = {
      id: nextId(), type: 'row',
      item: '', spec: '', qty: '', unitPrice: '', amount: '', note: '',
      level: newLevel,
    }
    const newRows = [...rows]
    newRows.splice(insertAt, 0, newRow)
    setRows(newRows, true)
  }

  const addCategoryRow = () => {
    const newRow = {
      id: nextId(), type: 'header',
      item: '', spec: '', qty: '', unitPrice: '', amount: '', note: '',
    }
    setRows(renumberHeaders([...rows, newRow]), true)
  }

  const addItemRow = () => {
    const newRow = {
      id: nextId(), type: 'row',
      item: '', spec: '', qty: '', unitPrice: '', amount: '', note: '', level: 1,
    }
    setRows([...rows, newRow], true)
  }

  // ── effectiveRows: 표시·계산·내보내기에 쓰는 파생 데이터 ─────────────────────
  // • 일반 행: qty × unitPrice 가 모두 있으면 amount 자동 계산
  // • 헤더 행: 하위 행 amount 합산 → amount 자동 산출
  const effectiveRows = (() => {
    // 1차: 유효 금액 계산 (일반 행)
    const effAmt = rows.map((row) => {
      if (row.type !== 'row') return 0
      const q = parseNum(row.qty)
      const u = parseNum(row.unitPrice)
      if (q && u) return q * u          // 수량 × 단가
      if (!q && u) return u              // 단가만 있으면 단가를 금액으로
      return parseNum(row.amount)        // 수동 입력값
    })

    // 2차: 섹션별 소계
    const sectionTotals = {}
    let curHeaderIdx = null
    rows.forEach((row, i) => {
      if (row.type === 'header') {
        curHeaderIdx = i
        sectionTotals[i] = 0
      } else if (curHeaderIdx !== null) {
        sectionTotals[curHeaderIdx] = (sectionTotals[curHeaderIdx] || 0) + effAmt[i]
      }
    })

    // 3차: 행 데이터 보강
    return rows.map((row, i) => {
      if (row.type === 'header') {
        const sub = sectionTotals[i] || 0
        return { ...row, _subtotal: sub, amount: sub > 0 ? sub.toLocaleString('ko-KR') : '' }
      }
      const q = parseNum(row.qty)
      const u = parseNum(row.unitPrice)
      const computed = u && (q || !parseNum(row.amount))  // 단가 있으면 자동 계산
      return {
        ...row,
        _computed: computed,
        amount: computed ? effAmt[i].toLocaleString('ko-KR') : row.amount,
      }
    })
  })()

  const total = effectiveRows.reduce((sum, row) => {
    if (row.type === 'row') return sum + parseNum(row.amount)
    return sum
  }, 0)

  // 섹션 헤더 번호 기반 자동 번호: 1-1., 1-2., 1-2-1.
  const rowNumbers = (() => {
    const nums = {}
    let hNum = 0, l1 = 0, l2 = 0
    rows.forEach((row, i) => {
      if (row.type === 'header') {
        const m = row.item.match(/^(\d+)\./)
        hNum = m ? parseInt(m[1]) : hNum + 1
        l1 = 0; l2 = 0
      } else {
        const lv = getRowLevel(row)
        if (lv === 1) { l1++; l2 = 0; nums[i] = `${hNum}-${l1}.` }
        else          { l2++;          nums[i] = `${hNum}-${l1}-${l2}.` }
      }
    })
    return nums
  })()

  const handlePrint = () => {
    const paper = document.getElementById('quote-print')
    const prevZoom = paper?.style.zoom
    if (paper) paper.style.zoom = '1'
    window.print()
    if (paper && prevZoom !== undefined) paper.style.zoom = prevZoom
  }

  const handleXlsx = () => {
    exportToXlsx(info, effectiveRows, extras).catch((err) => {
      console.error('XLSX 내보내기 실패:', err)
      alert('엑셀 파일 저장 중 오류가 발생했습니다.')
    })
  }

  const updateExtra = (i, text) => {
    const ne = [...extras]
    ne[i] = { ...ne[i], text }
    setExtras(ne)   // 타이핑 → 디바운스
  }

  const addExtra = () => {
    setExtras([...extras, { id: nextId(), text: '' }], true)
  }

  const deleteExtra = (i) => {
    setExtras(extras.filter((_, idx) => idx !== i), true)
  }

  return (
    <div className="editor-layout">
      {/* Supplier Modal */}
      {showSupplier && (
        <SupplierModal
          supplier={currentSupplier}
          onSave={handleSupplierSave}
          onClose={() => setShowSupplier(false)}
        />
      )}

      {/* Toolbar */}
      <div className="toolbar no-print">
        <div className="toolbar-left">
          <button className="toolbar-btn outline" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            처음으로
          </button>
          {onGoToMemo && (
            <button className="toolbar-btn outline memo-switch-btn" onClick={onGoToMemo} title="현장 메모로 돌아가기">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
              </svg>
              현장 메모
            </button>
          )}
        </div>
        <div className="toolbar-center">
          <div className="undo-redo-group">
            <button
              className="toolbar-btn outline sm icon-btn"
              onClick={undo}
              disabled={!canUndo}
              title="실행 취소 (Ctrl+Z)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 13A9 9 0 1 0 5.7 6.3L3 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="toolbar-btn outline sm icon-btn"
              onClick={redo}
              disabled={!canRedo}
              title="다시 실행 (Ctrl+Y)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 7v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 13A9 9 0 1 1 18.3 6.3L21 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <button className="toolbar-btn outline sm" onClick={addItemRow}>
            + 행 추가
          </button>
          <button className="toolbar-btn outline sm" onClick={addCategoryRow}>
            + 항목 추가
          </button>
          <div className="zoom-controls">
            <button
              className="toolbar-btn outline sm zoom-btn"
              onClick={() => changeZoom(-10)}
              title="축소 (−10%)"
              disabled={zoom <= 50}
            >−</button>
            <button
              className="zoom-label"
              onClick={() => setZoom(100)}
              title="100% 초기화"
            >{zoom}%</button>
            <button
              className="toolbar-btn outline sm zoom-btn"
              onClick={() => changeZoom(10)}
              title="확대 (+10%)"
              disabled={zoom >= 150}
            >+</button>
          </div>
        </div>
        <div className="toolbar-right">
          {isSupabaseReady && (
            <button
              className="toolbar-btn outline supplier-btn"
              onClick={() => setShowSupplier(true)}
              title="공급자 정보 관리"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinejoin="round" />
                <path d="M9 22V12h6v10" strokeLinejoin="round" />
              </svg>
              공급자
            </button>
          )}
          {isSupabaseReady && (
            <button
              className={`toolbar-btn cloud-save-btn${saving ? ' saving' : ''}`}
              onClick={handleCloudSave}
              disabled={saving}
              title="클라우드에 저장"
            >
              {saving ? (
                <span className="btn-spinner" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9A7 7 0 005.2 9H4a4 4 0 000 8h1M12 12v9M9 18l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {saveMsg || (data.supabaseId ? '업데이트' : '저장')}
            </button>
          )}
          <button className="toolbar-btn outline" onClick={handleXlsx}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
              <path d="M14 2v6h6M8 13l2 2 4-4M8 17h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            XLSX 저장
          </button>
          <button className="toolbar-btn primary" onClick={handlePrint}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeLinejoin="round" />
              <path d="M6 14h12v8H6v-8z" strokeLinejoin="round" />
            </svg>
            PDF / 인쇄
          </button>
        </div>
      </div>

      {/* 우측 하단 플로팅 패널 */}
      <div className="editor-corner no-print">
        {showShortcuts && (
          <div className="shortcut-panel-float">
            <div className="shortcut-grid">
              <div className="shortcut-group">
                <p className="shortcut-group-title">셀 이동</p>
                <ShortcutRow keys={['↑', '↓', '←', '→']} desc="인접 셀로 이동" />
                <ShortcutRow keys={['Enter']} desc="아래 셀로 이동" />
                <ShortcutRow keys={['Shift', 'Enter']} desc="셀 내 개행" join="+" />
                <ShortcutRow keys={['Tab']} desc="품목 하위 단계로 (1-1 → 1-1-1)" />
                <ShortcutRow keys={['Shift', 'Tab']} desc="품목 상위 단계로 (1-1-1 → 1-1)" join="+" />
              </div>
              <div className="shortcut-group">
                <p className="shortcut-group-title">행 선택 · 이동</p>
                <ShortcutRow keys={['핸들 클릭']} desc="해당 행 선택" />
                <ShortcutRow keys={['Shift', '핸들 클릭']} desc="범위 선택" join="+" />
                <ShortcutRow keys={['드래그']} desc="선택 행 이동" />
              </div>
              <div className="shortcut-group">
                <p className="shortcut-group-title">실행 취소</p>
                <ShortcutRow keys={['Ctrl', 'Z']} desc="실행 취소" join="+" />
                <ShortcutRow keys={['Ctrl', 'Y']} desc="다시 실행" join="+" />
              </div>
              <div className="shortcut-group">
                <p className="shortcut-group-title">보기</p>
                <ShortcutRow keys={['−', '+']} desc="축소 / 확대" join=" / " />
                <ShortcutRow keys={['100%']} desc="클릭 시 배율 초기화" />
              </div>
            </div>
          </div>
        )}
        <div className="editor-corner-btns">
          <button
            className={`corner-btn${showShortcuts ? ' active' : ''}`}
            onClick={() => setShowShortcuts((v) => !v)}
            title="단축키 안내"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" strokeLinecap="round" />
            </svg>
            단축키
          </button>
          {onSignOut && (
            <button className="corner-btn signout" onClick={onSignOut} title="로그아웃">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              로그아웃
            </button>
          )}
        </div>
      </div>

      {/* A4 Quote */}
      <div className="quote-outer">
        <div className="quote-paper" id="quote-print" style={{ zoom: `${zoom}%` }}>

          {/* Title */}
          <div className="quote-title-row">
            <h1 className="quote-title">견&nbsp;&nbsp;&nbsp;적&nbsp;&nbsp;&nbsp;서</h1>
            <div className="construction-period">
              <span>공사기간 :</span>
              <input
                className="period-input"
                value={info.constructionStart}
                placeholder="시작일"
                onChange={(e) => setInfo('constructionStart', e.target.value)}
              />
              <span>~</span>
              <input
                className="period-input"
                value={info.constructionEnd}
                placeholder="종료일"
                onChange={(e) => setInfo('constructionEnd', e.target.value)}
              />
            </div>
          </div>

          {/* Header Info */}
          <div className="quote-header">
            {/* Left: client */}
            <div className="header-left">
              <div className="header-date">
                <input
                  className="date-input"
                  value={info.date}
                  placeholder="2026년  월  일"
                  onChange={(e) => setInfo('date', e.target.value)}
                />
              </div>
              <div className="client-block">
                <input
                  className="client-input"
                  value={info.client}
                  placeholder="고객명 / 주소 귀하"
                  onChange={(e) => setInfo('client', e.target.value)}
                />
                <span className="client-suffix">귀하</span>
              </div>
              <p className="header-subtitle">아래와 같이 견적합니다.</p>
            </div>

            {/* Right: supplier */}
            <div className="header-right">
              <div className="supplier-title">공급자</div>
              <table className="supplier-table">
                <tbody>
                  <tr>
                    <th>등록번호</th>
                    <td colSpan={3}>
                      <input className="supplier-input" value={info.registrationNumber}
                        placeholder="000-00-00000"
                        onChange={(e) => setInfo('registrationNumber', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <th>상호명<br />(법인명)</th>
                    <td>
                      <input className="supplier-input" value={info.companyName}
                        placeholder="상호명"
                        onChange={(e) => setInfo('companyName', e.target.value)} />
                    </td>
                    <th>담당자</th>
                    <td>
                      <input className="supplier-input" value={info.manager}
                        placeholder="담당자"
                        onChange={(e) => setInfo('manager', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <th>주소</th>
                    <td colSpan={3}>
                      <input className="supplier-input" value={info.address}
                        placeholder="사업장 주소"
                        onChange={(e) => setInfo('address', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <th>업태</th>
                    <td>
                      <input className="supplier-input" value={info.industry}
                        onChange={(e) => setInfo('industry', e.target.value)} />
                    </td>
                    <th>종목</th>
                    <td>
                      <input className="supplier-input" value={info.type}
                        onChange={(e) => setInfo('type', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <th>전화번호</th>
                    <td>
                      <input className="supplier-input" value={info.phone}
                        placeholder="000-0000-0000"
                        onChange={(e) => setInfo('phone', e.target.value)} />
                    </td>
                    <th>팩스</th>
                    <td>
                      <input className="supplier-input" value={info.fax}
                        placeholder="팩스번호"
                        onChange={(e) => setInfo('fax', e.target.value)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total */}
          <div className="quote-total-bar">
            <span className="total-label">합 계 금 액</span>
            <span className="total-value">￦ {total.toLocaleString('ko-KR')}</span>
            <span className="total-vat">(VAT 별도)</span>
          </div>

          {/* Table */}
          <table className="quote-table">
            <colgroup>
              <col className="col-item" />
              <col className="col-spec" />
              <col className="col-qty" />
              <col className="col-price" />
              <col className="col-amount" />
              <col className="col-note" />
            </colgroup>
            <thead>
              <tr className="table-head-row">
                <th>품목</th>
                <th>규격</th>
                <th>수량</th>
                <th>단가</th>
                <th>금액</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <QuoteRow
                  key={row.id}
                  row={row}
                  effRow={effectiveRows[index]}
                  index={index}
                  rowNumber={rowNumbers[index]}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                  onAddAfter={addRowAfter}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  dragOverPos={dragOver?.index === index ? dragOver.pos : null}
                  isSelected={selectedIds.has(row.id)}
                  onHandleClick={handleHandleClick}
                  isLast={index === rows.length - 1}
                />
              ))}
            </tbody>
          </table>

          {/* Extras / 별도사항 */}
          <div className="extras-section">
            <div className="extras-header">
              <span className="extras-title">★★ 별도 사항 ★★</span>
              <button className="extras-add-btn no-print" onClick={addExtra}>+ 추가</button>
            </div>
            {extras.map((ex, i) => (
              <div key={ex.id} className="extra-row">
                <input
                  className="extra-input"
                  value={ex.text}
                  onChange={(e) => updateExtra(i, e.target.value)}
                  placeholder="별도사항 입력..."
                />
                <button className="row-btn row-btn-del no-print" onClick={() => deleteExtra(i)}>×</button>
              </div>
            ))}
          </div>

          {/* Bottom total */}
          <div className="quote-bottom">
            <table className="bottom-table">
              <tbody>
                <tr>
                  <th>합계</th>
                  <td>￦ {total.toLocaleString('ko-KR')}</td>
                  <td className="vat-note">* VAT 별도</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
