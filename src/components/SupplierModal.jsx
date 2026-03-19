import { useState } from 'react'
import { saveSupplierSettings } from '../lib/db'

const FIELDS = [
  { key: 'companyName',        label: '상호명 (법인명)', placeholder: '예) 디자인 몬드' },
  { key: 'registrationNumber', label: '등록번호',        placeholder: '예) 895-02-02282' },
  { key: 'manager',            label: '담당자',          placeholder: '예) 홍길동' },
  { key: 'address',            label: '주소',            placeholder: '예) 부산시 연제구 쌍미천로 163, 3층' },
  { key: 'industry',           label: '업태',            placeholder: '건설업' },
  { key: 'type',               label: '종목',            placeholder: '인테리어' },
  { key: 'phone',              label: '전화번호',        placeholder: '예) 010-0000-0000' },
  { key: 'fax',                label: '팩스',            placeholder: '예) 051-000-0000' },
]

export default function SupplierModal({ supplier, onSave, onClose }) {
  const [form,   setForm]   = useState({ ...supplier })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSupplierSettings(form)
      setSaved(true)
      setTimeout(() => {
        onSave(form)
        onClose()
      }, 600)
    } catch (e) {
      console.error('공급자 저장 실패:', e)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="modal-title">공급자 정보</h2>
            <p className="modal-subtitle">저장하면 이후 모든 견적서에 자동 적용됩니다</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="modal-field">
                <label className="modal-label">{label}</label>
                <input
                  className="modal-input"
                  value={form[key] || ''}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onClose}>취소</button>
          <button
            className={`modal-save${saved ? ' saved' : ''}`}
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saved ? '✓ 저장됨' : saving ? '저장 중...' : '저장 및 현재 견적서에 적용'}
          </button>
        </div>

      </div>
    </div>
  )
}
