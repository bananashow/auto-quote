import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS, INITIAL_FORM } from '../data/memoFormConfig'
import { formToQuote } from '../utils/formToQuote'
import { renumberHeaders } from '../data/defaultTemplate'
import { saveMemo, completeDraft, saveQuote, saveDraft } from '../lib/db'
import { isSupabaseReady } from '../lib/supabase'

// ── 옵션 칩 (단일 선택) ──────────────────────────────
function RadioGroup({ options, value, onChange }) {
  return (
    <div className="option-group">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`option-chip${value === opt ? ' selected' : ''}`}
          onClick={() => onChange(value === opt ? '' : opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── 옵션 칩 (다중 선택) ──────────────────────────────
function MultiGroup({ options, value, onChange }) {
  const arr = Array.isArray(value) ? value : []
  const toggle = (opt) => {
    onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
  }
  return (
    <div className="option-group">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`option-chip multi${arr.includes(opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          {arr.includes(opt) && <span className="check-mark">✓ </span>}
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── 필드 렌더러 ──────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  if (field.type === 'radio') {
    return <RadioGroup options={field.options} value={value} onChange={onChange} />
  }
  if (field.type === 'multi') {
    return <MultiGroup options={field.options} value={value} onChange={onChange} />
  }
  if (field.type === 'text') {
    return (
      <input
        className="memo-text-input"
        value={value || ''}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        className="memo-textarea"
        value={value || ''}
        placeholder="메모를 입력하세요..."
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return null
}

// ── 섹션 렌더러 ──────────────────────────────────────
function SectionForm({ section, data, onUpdate }) {
  const get = (id) => (data ? data[id] : undefined)
  const set = (id, val) => onUpdate({ ...data, [id]: val })

  return (
    <div className="section-form">
      {section.groups.map((group) => (
        <div key={group.label} className="form-group">
          <p className="form-group-label">{group.label}</p>
          {group.fields.map((field) => (
            <div key={field.id} className={`form-field${field.sub ? ' sub-field' : ''}`}>
              {field.label && <p className="field-sub-label">{field.label}</p>}
              <FieldRenderer
                field={field}
                value={get(field.id)}
                onChange={(v) => set(field.id, v)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── 방 섹션 (방 수에 따라 탭 분리) ─────────────────
function RoomsSection({ roomCount, rooms, onUpdate }) {
  const count = parseInt(roomCount) || 2
  const [activeRoom, setActiveRoom] = useState(0)
  const section = SECTIONS.find((s) => s.id === 'rooms')

  const updateRoom = (idx, data) => {
    const next = [...rooms]
    next[idx] = data
    onUpdate(next)
  }

  return (
    <div className="section-form">
      <div className="room-tabs">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`room-tab${activeRoom === i ? ' active' : ''}`}
            onClick={() => setActiveRoom(i)}
          >
            방 {i + 1}
          </button>
        ))}
      </div>
      <SectionForm
        section={section}
        data={rooms[activeRoom] || {}}
        onUpdate={(d) => updateRoom(activeRoom, d)}
      />
    </div>
  )
}

// ── 진행 상황 요약 ───────────────────────────────────
function SummarySection({ form }) {
  const items = []
  const add = (label, val) => val && items.push({ label, val })

  add('현장 주소', form.info?.address)
  add('평수', form.info?.area)
  add('예산', form.schedule?.budget)
  add('입주 희망일', form.schedule?.moveIn)

  const countSelected = (obj) => {
    if (!obj) return 0
    return Object.values(obj).reduce((n, v) => {
      if (Array.isArray(v)) return n + v.length
      if (typeof v === 'string' && v) return n + 1
      return n
    }, 0)
  }

  return (
    <div className="section-form">
      <div className="form-group">
        <p className="form-group-label">기본 정보</p>
        {items.length > 0 ? items.map((it) => (
          <div key={it.label} className="summary-row">
            <span className="summary-label">{it.label}</span>
            <span className="summary-value">{it.val}</span>
          </div>
        )) : <p className="summary-empty">기본 정보를 먼저 입력해주세요.</p>}
      </div>

      <div className="form-group">
        <p className="form-group-label">선택 항목 현황</p>
        {[
          { id: 'entrance', title: '현관' },
          { id: 'bathroom1', title: '욕실(공용)' },
          { id: 'bathroom2', title: '욕실(안방)' },
          { id: 'living', title: '거실' },
          { id: 'kitchen', title: '주방' },
          { id: 'overall', title: '전체 마감' },
        ].map(({ id, title }) => {
          const cnt = countSelected(form[id])
          return (
            <div key={id} className="summary-row">
              <span className="summary-label">{title}</span>
              <span className={`summary-badge${cnt ? ' has-data' : ''}`}>
                {cnt ? `${cnt}개 선택` : '미입력'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="summary-notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
        <span>견적서 생성 후 에디터에서 금액·항목을 자유롭게 수정할 수 있습니다.</span>
      </div>
    </div>
  )
}

// ── 메인 MemoForm ────────────────────────────────────
export default function MemoForm({ onComplete, onBack, initialForm, initialDraftId, hasQuote, onViewQuote }) {
  const [form,      setForm]      = useState(initialForm ?? INITIAL_FORM)
  const [activeIdx, setActiveIdx] = useState(0)
  const [draftId,   setDraftId]   = useState(initialDraftId ?? null)
  const [draftMsg,  setDraftMsg]  = useState('')
  const [draftSaving, setDraftSaving] = useState(false)
  const autoSaveTimer = useRef(null)
  const draftMsgTimer = useRef(null)
  const draftIdRef    = useRef(draftId)
  useEffect(() => { draftIdRef.current = draftId }, [draftId])

  const regularSections = SECTIONS.filter((s) => s.id !== 'rooms')
  const allTabs = [
    ...SECTIONS.slice(0, SECTIONS.findIndex((s) => s.id === 'rooms') + 1),
    ...SECTIONS.slice(SECTIONS.findIndex((s) => s.id === 'rooms') + 1),
    { id: '_summary', title: '완료', icon: '✅' },
  ]

  const update = (sectionId, data) => {
    setForm((prev) => ({ ...prev, [sectionId]: data }))
  }

  const doSaveDraft = useCallback(async (formSnap, curDraftId) => {
    if (!isSupabaseReady) return
    setDraftSaving(true)
    try {
      const id = await saveDraft(formSnap, curDraftId)
      setDraftId(id)
      draftIdRef.current = id
      clearTimeout(draftMsgTimer.current)
      setDraftMsg('임시 저장됨 ✓')
      draftMsgTimer.current = setTimeout(() => setDraftMsg(''), 2500)
    } catch (e) {
      console.error(e)
      setDraftMsg('저장 실패')
      draftMsgTimer.current = setTimeout(() => setDraftMsg(''), 2500)
    } finally {
      setDraftSaving(false)
    }
  }, []) // 상태 setter는 안정적이므로 deps 불필요

  const handleSaveDraft = useCallback(() => {
    clearTimeout(autoSaveTimer.current)
    doSaveDraft(form, draftIdRef.current)
  }, [doSaveDraft, form])

  // form 변경 시 3초 디바운스 자동 저장 (draftId 있을 때만)
  useEffect(() => {
    if (!isSupabaseReady || !draftIdRef.current) return
    const snap = form // 이 시점 form 캡처
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      doSaveDraft(snap, draftIdRef.current)
    }, 3000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [form, doSaveDraft])

  const handleGenerate = async () => {
    const result = formToQuote(form)
    result.rows = renumberHeaders(result.rows)

    if (isSupabaseReady) {
      try {
        // draft가 이미 있으면 status만 completed로 전환 (중복 INSERT 방지)
        if (draftIdRef.current) {
          await completeDraft(draftIdRef.current, form)
        } else {
          await saveMemo(form)
        }
        const quoteId = await saveQuote({ ...result, supabaseId: null })
        onComplete({ ...result, supabaseId: quoteId })
        return
      } catch (e) {
        console.error('자동 저장 실패 (진행은 계속됩니다):', e)
      }
    }
    onComplete(result)
  }

  const currentSection = allTabs[activeIdx]
  const isLast = activeIdx === allTabs.length - 1

  const renderContent = () => {
    if (!currentSection) return null

    if (currentSection.id === '_summary') {
      return <SummarySection form={form} />
    }

    if (currentSection.id === 'rooms') {
      return (
        <RoomsSection
          roomCount={form.info?.roomCount || '2'}
          rooms={form.rooms || []}
          onUpdate={(rooms) => update('rooms', rooms)}
        />
      )
    }

    const sectionDef = SECTIONS.find((s) => s.id === currentSection.id)
    if (!sectionDef) return null

    return (
      <SectionForm
        section={sectionDef}
        data={form[currentSection.id] || {}}
        onUpdate={(d) => update(currentSection.id, d)}
      />
    )
  }

  return (
    <div className="memo-form-layout">
      {/* 좌측 사이드바 */}
      <nav className="memo-sidebar">
        <div className="memo-sidebar-header">
          <button className="memo-back-btn" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            처음으로
          </button>
          <h2 className="memo-sidebar-title">현장 메모</h2>
          {hasQuote && onViewQuote && (
            <button className="memo-view-quote-btn" onClick={onViewQuote} title="생성된 견적서 보기">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
                <path d="M14 2v6h6" strokeLinecap="round" />
              </svg>
              견적서 보기
            </button>
          )}
        </div>

        <ul className="memo-nav-list">
          {allTabs.map((tab, idx) => (
            <li key={tab.id}>
              <button
                className={`memo-nav-item${activeIdx === idx ? ' active' : ''}`}
                onClick={() => setActiveIdx(idx)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.title}</span>
                {idx < activeIdx && tab.id !== '_summary' && (
                  <span className="nav-done">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="memo-main">
        <div className="memo-main-header">
          <span className="section-icon">{currentSection?.icon}</span>
          <h2 className="section-title">{currentSection?.title}</h2>
          <span className="section-progress">{activeIdx + 1} / {allTabs.length}</span>
          {isSupabaseReady && (
            <button
              className="memo-draft-btn"
              onClick={handleSaveDraft}
              disabled={draftSaving}
              title="임시 저장"
            >
              {draftSaving
                ? <span className="btn-spinner" style={{ borderColor: 'rgba(100,116,139,.4)', borderTopColor: '#64748b' }} />
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinejoin="round" />
                    <path d="M17 21v-8H7v8M7 3v5h8" strokeLinejoin="round" />
                  </svg>
              }
              {draftMsg || '임시 저장'}
            </button>
          )}
        </div>

        <div className="memo-content">
          {renderContent()}
        </div>

        <div className="memo-footer">
          <button
            className="memo-nav-btn outline"
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            disabled={activeIdx === 0}
          >
            ← 이전
          </button>

          {isLast ? (
            <button className="memo-nav-btn primary generate-btn" onClick={handleGenerate}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinejoin="round" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
              </svg>
              견적서 생성
            </button>
          ) : (
            <button
              className="memo-nav-btn primary"
              onClick={() => setActiveIdx((i) => Math.min(allTabs.length - 1, i + 1))}
            >
              다음 →
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
