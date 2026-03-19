import { useEffect, useRef, useState } from 'react'
import { extractTextFromPDF, extractHeaderInfo } from '../utils/pdfParser'
import { parseXlsxFile } from '../utils/parseXlsx'
import { createBlankRows, createDefaultRows, DEFAULT_INFO, DEFAULT_EXTRAS } from '../data/defaultTemplate'
import { getRecentQuotes, getRecentMemos, loadQuote, deleteQuote, deleteMemo } from '../lib/db'
import { isSupabaseReady as sbReady } from '../lib/supabase'
import StoragePanel from './StoragePanel'

export default function UploadZone({ onDataReady, onMemoForm, user, onSignOut, onLoadDraft }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [recentQuotes,  setRecentQuotes]  = useState([])
  const [recentMemos,   setRecentMemos]   = useState([])
  const [listLoading,   setListLoading]   = useState(false)
  const [showStorage,   setShowStorage]   = useState(false)

  const listFetchedRef = useRef(false)
  useEffect(() => {
    if (!sbReady || listFetchedRef.current) return
    listFetchedRef.current = true
    setListLoading(true)
    Promise.all([getRecentQuotes(8), getRecentMemos(5)])
      .then(([q, m]) => { setRecentQuotes(q); setRecentMemos(m) })
      .finally(() => setListLoading(false))
  }, [])

  // ── 파일 처리 ───────────────────────────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return
    const isPdf  = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
                   file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    if (!isPdf && !isXlsx) {
      setError('PDF 또는 Excel(.xlsx) 파일만 업로드 가능합니다.')
      return
    }

    setError('')
    setLoading(true)
    try {
      if (isPdf) {
        const text       = await extractTextFromPDF(file)
        const headerInfo = extractHeaderInfo(text)
        onDataReady({
          info:    { ...DEFAULT_INFO, ...headerInfo },
          rows:    createDefaultRows(),
          extras:  DEFAULT_EXTRAS.map((e) => ({ ...e })),
          pdfText: text,
        })
      } else {
        const parsed = await parseXlsxFile(file)
        onDataReady(parsed)
      }
    } catch (e) {
      console.error(e)
      setError(isPdf ? 'PDF 파싱 중 오류가 발생했습니다.' : 'Excel 파싱 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleFileChange = (e) => processFile(e.target.files[0])

  const handleNewBlank = () => {
    onDataReady({ info: { ...DEFAULT_INFO }, rows: createBlankRows(), extras: [] })
  }

  // ── 최근 항목 불러오기 ────────────────────────────────────────────────────
  const handleLoadQuote = async (item) => {
    setLoading(true)
    try {
      const data = await loadQuote(item.id)
      if (data) onDataReady(data)
    } catch {
      setError('불러오기에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuote = async (e, id) => {
    e.stopPropagation()
    if (!confirm('이 견적서를 삭제할까요?')) return
    await deleteQuote(id)
    setRecentQuotes((prev) => prev.filter((q) => q.id !== id))
  }

  const handleDeleteMemo = async (e, id) => {
    e.stopPropagation()
    if (!confirm('이 메모를 삭제할까요?')) return
    await deleteMemo(id)
    setRecentMemos((prev) => prev.filter((m) => m.id !== id))
  }

  const fmtDate = (iso) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="upload-page">
      {/* StoragePanel 모달 */}
      {showStorage && (
        <StoragePanel
          onClose={() => setShowStorage(false)}
          onLoadQuote={(item) => handleLoadQuote(item)}
          onLoadDraft={(id) => { onLoadDraft(id) }}
        />
      )}

      {/* 사용자 정보 + 로그아웃 */}
      {user && (
        <div className="upload-topbar">
          <span className="topbar-email">{user.email}</span>
          <button className="topbar-signout" onClick={onSignOut}>로그아웃</button>
        </div>
      )}

      <div className="upload-hero">
        <div className="upload-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#2563eb" />
            <path d="M14 34V14h14l6 6v14H14z" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <path d="M28 14v6h6" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <path d="M19 26h10M19 30h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="upload-title">견적서 자동 생성기</h1>
        <p className="upload-subtitle">현장 메모를 작성하거나 파일을 업로드해 견적서를 만드세요</p>
      </div>

      {/* 최근 목록 */}
      {sbReady && (recentQuotes.length > 0 || recentMemos.length > 0 || listLoading) && (
        <div className="recent-section">
          <div className="recent-header">
            <h3 className="recent-title">최근 항목</h3>
            <button className="recent-manage-btn" onClick={() => setShowStorage(true)}>전체 관리</button>
          </div>
          {listLoading ? (
            <div className="recent-loading">불러오는 중...</div>
          ) : (
            <div className="recent-cols">
              {/* 견적서 컬럼 */}
              {recentQuotes.length > 0 && (
                <div className="recent-col">
                  <p className="recent-col-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
                      <path d="M14 2v6h6" strokeLinecap="round" />
                    </svg>
                    견적서
                  </p>
                  {recentQuotes.map((q) => (
                    <div key={q.id} className="recent-card" onClick={() => handleLoadQuote(q)}>
                      <span className="recent-name">{q.client || '(이름 없음)'}</span>
                      <span className="recent-date">{fmtDate(q.updated_at)}</span>
                      <button className="recent-del" onClick={(e) => handleDeleteQuote(e, q.id)} title="삭제">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* 현장 메모 컬럼 */}
              {recentMemos.length > 0 && (
                <div className="recent-col">
                  <p className="recent-col-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
                    </svg>
                    현장 메모
                  </p>
                  {recentMemos.map((m) => (
                    <div
                      key={m.id}
                      className={`recent-card${m.status === 'draft' ? ' draft-card' : ''}`}
                      onClick={() => onLoadDraft(m.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {m.status === 'draft' && <span className="recent-draft-dot" title="임시 저장" />}
                      <span className="recent-name">{m.address || '(주소 없음)'}</span>
                      <span className="recent-date">{fmtDate(m.updated_at || m.created_at)}</span>
                      <button className="recent-del" onClick={(e) => handleDeleteMemo(e, m.id)} title="삭제">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 드롭 존 */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {loading ? (
          <div className="upload-loading">
            <div className="spinner" />
            <p>파일 분석 중...</p>
          </div>
        ) : (
          <>
            <div className="drop-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
                <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="drop-main">PDF 또는 Excel 파일을 드래그하거나 클릭하세요</p>
            <div className="drop-badges">
              <span className="drop-badge pdf">PDF</span>
              <span className="drop-badge xlsx">XLSX</span>
            </div>
          </>
        )}
      </div>

      {error && <p className="upload-error">{error}</p>}

      <div className="upload-divider"><span>또는</span></div>

      <div className="upload-cta-row">
        <button className="btn-memo" onClick={onMemoForm}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
          </svg>
          현장 메모 작성하기
        </button>

        <button className="btn-blank" onClick={handleNewBlank}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          빈 견적서 새로 만들기
        </button>
      </div>

      <p className="upload-note">
        생성된 견적서는 PDF 및 XLSX 형식으로 다운로드 가능하며, A4 출력에 최적화됩니다.
      </p>
    </div>
  )
}
