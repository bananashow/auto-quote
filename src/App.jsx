import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { getSupplierSettings, loadMemo } from './lib/db'
import { todayDateStr } from './data/defaultTemplate'
import LoginPage from './components/LoginPage'
import UploadZone from './components/UploadZone'
import MemoForm from './components/MemoForm'
import QuoteEditor from './components/QuoteEditor'
import './App.css'

function App() {
  const [user,             setUser]             = useState(undefined)
  const [supplierSettings, setSupplierSettings] = useState(null)
  const [view,             setView]             = useState('upload')   // 'upload' | 'memo' | 'edit'
  const [quoteData,        setQuoteData]        = useState(null)
  // 현장 메모 <-> 견적서 양방향 이동용
  const [draftData,        setDraftData]        = useState(null)  // { form, draftId }
  const [fromMemo,         setFromMemo]         = useState(false) // 메모에서 생성된 견적서인지

  // ── 인증 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setUser(null); return }
    // onAuthStateChange 는 구독 즉시 INITIAL_SESSION 으로 현재 세션을 전달하므로
    // getSession() 별도 호출 불필요 (중복 user 세팅 방지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 같은 유저 ID로 중복 fetch 방지
  const supplierFetchedRef = useRef(null)
  useEffect(() => {
    if (!user) return
    if (supplierFetchedRef.current === user.id) return
    supplierFetchedRef.current = user.id
    getSupplierSettings().then((s) => { if (s) setSupplierSettings(s) })
  }, [user])

  const handleSignOut = async () => { await supabase?.auth.signOut() }

  // ── 새 견적서 (날짜 + 공급자 자동 적용) ──────────────────────────────────
  const handleDataReady = (data, isMemo = false) => {
    const mergedInfo = {
      ...data.info,
      date: data.info?.date || todayDateStr(),
      ...(supplierSettings ?? {}),
    }
    setQuoteData({ ...data, info: mergedInfo })
    setFromMemo(isMemo)
    setView('edit')
  }

  // MemoForm 완료 시 → 메모에서 온 것으로 표시
  const handleMemoComplete = (data) => handleDataReady(data, true)

  // ── 견적서 → 현장 메모로 돌아가기 ────────────────────────────────────────
  const handleGoToMemo = () => {
    setView('memo')
  }

  // ── 임시 저장 메모 불러오기 ───────────────────────────────────────────────
  const handleLoadDraft = async (draftId) => {
    try {
      const memo = await loadMemo(draftId)
      if (!memo) return
      setDraftData({ form: memo.data, draftId: memo.id })
      setView('memo')
    } catch (e) {
      console.error('임시 저장 로드 실패:', e)
    }
  }

  const handleReset = () => {
    setView('upload')
    setQuoteData(null)
    setDraftData(null)
    setFromMemo(false)
  }

  // ── 세션 확인 중 ─────────────────────────────────────────────────────────
  if (user === undefined) {
    return <div className="app-loading"><div className="spinner" /></div>
  }

  if (!user) return <LoginPage />

  return (
    <div className="app">
      {view === 'upload' && (
        <UploadZone
          onDataReady={handleDataReady}
          onMemoForm={() => { setDraftData(null); setView('memo') }}
          user={user}
          onSignOut={handleSignOut}
          onLoadDraft={handleLoadDraft}
        />
      )}
      {view === 'memo' && (
        <MemoForm
          onComplete={handleMemoComplete}
          onBack={() => { setDraftData(null); setView('upload') }}
          initialForm={draftData?.form}
          initialDraftId={draftData?.draftId}
          hasQuote={fromMemo && !!quoteData}
          onViewQuote={() => setView('edit')}
        />
      )}
      {view === 'edit' && (
        <QuoteEditor
          data={quoteData}
          onChange={setQuoteData}
          onReset={handleReset}
          onSignOut={handleSignOut}
          supplier={supplierSettings}
          onSupplierChange={setSupplierSettings}
          onGoToMemo={fromMemo ? handleGoToMemo : undefined}
        />
      )}
    </div>
  )
}

export default App
