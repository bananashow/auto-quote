import { supabase } from './supabase'

// ── 공급자 설정 ───────────────────────────────────────────────────────────────

export async function getSupplierSettings() {
  if (!supabase) return null
  const { data } = await supabase
    .from('settings')
    .select('data')
    .eq('key', 'supplier')
    .maybeSingle()
  return data?.data ?? null
}

export async function saveSupplierSettings(supplierInfo) {
  if (!supabase) return
  await supabase
    .from('settings')
    .upsert(
      { key: 'supplier', data: supplierInfo, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
}

// ── 견적서 ────────────────────────────────────────────────────────────────────

export async function saveQuote(quoteData) {
  if (!supabase) return null
  const { info, rows, extras, supabaseId } = quoteData
  const payload = {
    client: info?.client || '',
    data: { info, rows, extras },
    updated_at: new Date().toISOString(),
  }

  if (supabaseId) {
    const { data, error } = await supabase
      .from('quotes')
      .update(payload)
      .eq('id', supabaseId)
      .select('id')
      .single()
    if (error) throw error
    return data.id
  } else {
    const { data, error } = await supabase
      .from('quotes')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }
}

export async function loadQuote(id) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return { ...data.data, supabaseId: data.id }
}

export async function deleteQuote(id) {
  if (!supabase) return
  await supabase.from('quotes').delete().eq('id', id)
}

export async function getRecentQuotes(limit = 8) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('quotes')
    .select('id, created_at, updated_at, client')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}

export async function getAllQuotes() {
  if (!supabase) return []
  const { data } = await supabase
    .from('quotes')
    .select('id, created_at, updated_at, client')
    .order('updated_at', { ascending: false })
  return data || []
}

// ── 현장 메모 ─────────────────────────────────────────────────────────────────

function memoLabel(formData) {
  const info = formData?.info ?? {}
  return info.address || info.date || ''
}

export async function saveMemo(formData) {
  if (!supabase) return null
  const address = memoLabel(formData)
  const { data, error } = await supabase
    .from('memos')
    .insert({ address, data: formData, status: 'completed' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// 임시 저장된 draft를 completed로 전환 (중복 INSERT 방지)
export async function completeDraft(draftId, formData) {
  if (!supabase) return null
  const address = memoLabel(formData)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('memos')
    .update({ address, data: formData, status: 'completed', updated_at: now })
    .eq('id', draftId)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// 임시 저장: draftId 있으면 update, 없으면 insert
export async function saveDraft(formData, draftId = null) {
  if (!supabase) return null
  const address = memoLabel(formData)
  const now = new Date().toISOString()
  if (draftId) {
    await supabase
      .from('memos')
      .update({ address, data: formData, updated_at: now })
      .eq('id', draftId)
    return draftId
  } else {
    const { data, error } = await supabase
      .from('memos')
      .insert({ address, data: formData, status: 'draft', updated_at: now })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }
}

export async function loadMemo(id) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function deleteMemo(id) {
  if (!supabase) return
  await supabase.from('memos').delete().eq('id', id)
}

export async function getRecentMemos(limit = 5) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('memos')
    .select('id, created_at, updated_at, address, status')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}

export async function getAllMemos() {
  if (!supabase) return []
  const { data } = await supabase
    .from('memos')
    .select('id, created_at, updated_at, address, status')
    .order('created_at', { ascending: false })
  return data || []
}

// ── 저장 통계 (Supabase RPC 용량만, count는 호출부에서 배열 길이로 계산) ─────

export async function getStorageUsedBytes() {
  if (!supabase) return null
  try {
    const { data } = await supabase.rpc('get_storage_bytes')
    return data ?? null
  } catch (_) {
    return null // RPC 미설치 시 무시
  }
}
