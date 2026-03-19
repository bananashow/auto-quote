import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    setError('')
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : err.message || '로그인에 실패했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#2563eb" />
            <path d="M14 34V14h14l6 6v14H14z" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <path d="M28 14v6h6" stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <path d="M19 26h10M19 30h7" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="login-title">견적서 자동 생성기</h1>
        <p className="login-subtitle">계정으로 로그인하여 계속하세요</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label className="login-label">이메일</label>
            <input
              className="login-input"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">비밀번호</label>
            <input
              className="login-input"
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            className="login-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? <span className="btn-spinner" /> : null}
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-note">
          계정이 없으신 경우 관리자에게 문의하세요
        </p>
      </div>
    </div>
  )
}
