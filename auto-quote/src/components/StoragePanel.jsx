import { useEffect, useRef, useState } from 'react'
import { getAllQuotes, getAllMemos, deleteQuote, deleteMemo, getStorageUsedBytes } from '../lib/db'

const FREE_BYTES = 500 * 1024 * 1024 // 500 MB

function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function fmtBytes(bytes) {
  if (bytes == null) return null
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 카운트 기반 예상 용량 (RPC 없을 때 fallback)
function estimateBytes(quotesCount, memosCount) {
  return quotesCount * 15360 + memosCount * 5120 // ~15KB/견적서, ~5KB/메모
}

export default function StoragePanel({ onClose, onLoadQuote, onLoadDraft }) {
  const [quotes,     setQuotes]     = useState([])
  const [memos,      setMemos]      = useState([])
  const [usedBytes,  setUsedBytes]  = useState(undefined) // undefined = 로딩 중
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('quotes')
  const [selected,   setSelected]   = useState(new Set())

  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    Promise.all([getAllQuotes(), getAllMemos(), getStorageUsedBytes()])
      .then(([q, m, bytes]) => { setQuotes(q); setMemos(m); setUsedBytes(bytes ?? null) })
      .finally(() => setLoading(false))
  }, [])

  const list = tab === 'quotes' ? quotes : memos

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectAll  = () => setSelected(new Set(list.map((i) => i.id)))
  const clearSelect = () => setSelected(new Set())

  const handleDeleteSelected = async () => {
    if (!selected.size) return
    const label = tab === 'quotes' ? '견적서' : '메모'
    if (!confirm(`선택한 ${selected.size}개 ${label}를 삭제할까요?`)) return
    const del = tab === 'quotes' ? deleteQuote : deleteMemo
    await Promise.all([...selected].map((id) => del(id)))
    if (tab === 'quotes') setQuotes((prev) => prev.filter((q) => !selected.has(q.id)))
    else setMemos((prev) => prev.filter((m) => !selected.has(m.id)))
    setSelected(new Set())
  }

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation()
    const label = tab === 'quotes' ? '견적서' : '메모'
    if (!confirm(`이 ${label}를 삭제할까요?`)) return
    if (tab === 'quotes') { await deleteQuote(id); setQuotes((p) => p.filter((x) => x.id !== id)) }
    else { await deleteMemo(id); setMemos((p) => p.filter((x) => x.id !== id)) }
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  // 용량 계산 — RPC 없으면 배열 길이 기반 추정
  const displayBytes = usedBytes ?? estimateBytes(quotes.length, memos.length)
  const pct          = Math.min(100, (displayBytes / FREE_BYTES) * 100)
  const isEstimate   = usedBytes == null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="storage-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="modal-title">저장 내역 관리</h2>
            <p className="modal-subtitle">견적서 {quotes.length}개 · 메모 {memos.length}개</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Storage bar */}
        <div className="storage-bar-section">
          <div className="storage-bar-top">
            <span className="storage-label">
              사용량
              {isEstimate && <span className="storage-est"> (추정치)</span>}
            </span>
            <span className="storage-value">
              {fmtBytes(displayBytes)} / 500 MB
            </span>
          </div>
          <div className="storage-track">
            <div
              className="storage-fill"
              style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="storage-tabs">
          <button
            className={`storage-tab${tab === 'quotes' ? ' active' : ''}`}
            onClick={() => { setTab('quotes'); setSelected(new Set()) }}
          >
            견적서 ({quotes.length})
          </button>
          <button
            className={`storage-tab${tab === 'memos' ? ' active' : ''}`}
            onClick={() => { setTab('memos'); setSelected(new Set()) }}
          >
            현장 메모 ({memos.length})
          </button>
        </div>

        {/* Toolbar */}
        <div className="storage-toolbar">
          <label className="storage-check-all">
            <input
              type="checkbox"
              checked={selected.size === list.length && list.length > 0}
              onChange={(e) => e.target.checked ? selectAll() : clearSelect()}
            />
            전체 선택
          </label>
          {selected.size > 0 && (
            <button className="storage-del-btn" onClick={handleDeleteSelected}>
              선택 삭제 ({selected.size})
            </button>
          )}
        </div>

        {/* List */}
        <div className="storage-list">
          {loading && <div className="storage-empty">불러오는 중...</div>}
          {!loading && list.length === 0 && <div className="storage-empty">저장된 항목이 없습니다.</div>}
          {list.map((item) => (
            <div
              key={item.id}
              className={`storage-item${selected.has(item.id) ? ' selected' : ''}`}
              onClick={() => toggleSelect(item.id)}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="storage-item-info">
                <span className="storage-item-name">
                  {tab === 'quotes'
                    ? (item.client || '(이름 없음)')
                    : (item.address || '(미입력)')}
                </span>
                {tab === 'memos' && item.status === 'draft' && (
                  <span className="draft-badge">임시 저장</span>
                )}
                <span className="storage-item-date">
                  {fmtDate(item.updated_at || item.created_at)}
                </span>
              </div>
              <div className="storage-item-actions" onClick={(e) => e.stopPropagation()}>
                {tab === 'quotes' && (
                  <button
                    className="storage-open-btn"
                    onClick={() => { onLoadQuote(item); onClose() }}
                  >열기</button>
                )}
                {tab === 'memos' && (
                  <button
                    className="storage-open-btn draft"
                    onClick={() => { onLoadDraft(item.id); onClose() }}
                  >{item.status === 'draft' ? '이어 작성' : '열기'}</button>
                )}
                <button
                  className="recent-del"
                  onClick={(e) => handleDeleteOne(e, item.id)}
                  title="삭제"
                >×</button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
