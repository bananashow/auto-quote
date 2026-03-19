import { nextId } from '../data/defaultTemplate'

const h = (item) => ({ id: nextId(), type: 'header', item, spec: '', qty: '', unitPrice: '', amount: '', note: '' })
const r = (item, spec = '', qty = '', unitPrice = '', amount = '', note = '') => ({
  id: nextId(), type: 'row', item, spec, qty, unitPrice, amount, note,
})

const arr = (v) => (Array.isArray(v) ? v : v ? [v] : [])
const has = (v, opt) => arr(v).includes(opt)
const any = (v, ...opts) => opts.some((o) => arr(v).includes(o))

export function formToQuote(form) {
  const rows = []
  const extras = []
  const {
    info, entrance, bathroom1, bathroom2, rooms,
    living, kitchen, overall, schedule,
  } = form

  // ──────────────────────────────────────────
  // 1. 철거
  // ──────────────────────────────────────────
  const demoItems = []

  if (entrance) {
    if (any(entrance.floor, '디딤석 단', '바닥 타일')) demoItems.push('현관 바닥')
    if (has(entrance.shoeRack, '제작') || has(entrance.opposite, '제작')) demoItems.push('현관 신발장')
    if (any(entrance.middleDoor, '철거', '철거+제작')) demoItems.push('현관 중문')
  }

  for (const bth of [bathroom1, bathroom2]) {
    if (!bth) continue
    if (any(bth.demo, '전체철거(방수1·2·3차)', '타일제외전체철거', '부분철거')) {
      demoItems.push(`${bth.label || '욕실'} 철거`)
    }
  }

  if (living) {
    if (has(living.artwall, '철거')) demoItems.push('거실 아트월')
  }

  if (demoItems.length > 0) {
    rows.push(h('1. 철거'))
    demoItems.forEach((d) => rows.push(r(` - ${d}`)))
    rows.push(r(' - 폐기물 처리비용', '1톤트럭', '2', '250,000', '', ''))
    rows.push(r(' - 인건비용', '인', '3', '250,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 2. 마루 철거 (마루 교체 시)
  // ──────────────────────────────────────────
  if (overall && any(overall.floor, '마루 시공', '장판 시공')) {
    rows.push(h('2. 마루 철거'))
    rows.push(r(' - 마루 철거 및 샌딩', '평', info?.area?.replace(/[^0-9]/g, '') || '', '35,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 3. 설비 공사
  // ──────────────────────────────────────────
  const plumbingRows = []

  for (const bth of [bathroom1, bathroom2]) {
    if (!bth || has(bth.demo, '해당없음')) continue
    const label = bth.label || '욕실'
    if (any(bth.zenDai, '긴ㅡ자형', 'T자형', 'ㄱ자형')) {
      plumbingRows.push(r(` - ${label} 젠다이 생성 (${arr(bth.zenDai).filter((z) => z !== '해당없음').join(', ')})`, '식', '1', '250,000', '', ''))
    }
    if (any(bth.partition, '반조적+반유리', '풀조적', '폼세라믹', '샤워파티션')) {
      plumbingRows.push(r(` - ${label} 샤워 파티션 (${bth.partition})`, '식', '1', '250,000', '', ''))
    }
  }

  if (plumbingRows.length > 0) {
    rows.push(h('3. 설비 공사'))
    rows.push(...plumbingRows)
  }

  // ──────────────────────────────────────────
  // 4. 전기 공사
  // ──────────────────────────────────────────
  const elecItems = []

  if (living) {
    if (has(living.lighting, '다운라이트')) elecItems.push(r(' - 집 전체 다운라이트', '', '', '1,300,000', '', ''))
    if (has(living.lighting, 'T5 간접조명')) elecItems.push(r(' - 거실 우물천장 T5 간접조명', '', '', '', '', ''))
    if (has(living.lighting, '실링팬 설치')) elecItems.push(r(' - 거실 실링팬 상시 전원', '', '', '', '', ''))
    if (has(living.aircon, '시스템에어컨 설치')) elecItems.push(r(' - 시스템에어컨 설치', '', '', '', '', ''))
  }

  if (overall && any(overall.lighting, '다운라이트 교체', 'LED 전등 교체', '콘센트/스위치 교체')) {
    overall.lighting.forEach((l) => elecItems.push(r(` - ${l}`, '', '', '', '', '')))
  }

  if (elecItems.length > 0) {
    rows.push(h('4. 전기 공사'))
    rows.push(...elecItems)
    rows.push(r(' - 배선공사 및 자재비용', '식', '1', '', '', ''))
    rows.push(r(' - 인건비용', '인', '4', '300,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 5. 목공사
  // ──────────────────────────────────────────
  const carpRows = []

  if (living) {
    if (has(living.tvWall, 'TV 반매립 MDF 벽체(필름)') || has(living.tvWall, 'TV 반매립 MDF 벽체(도배)')) {
      carpRows.push(r(` - TV 반매립 MDF 벽체 (${living.tvWall.includes('필름') ? '필름' : '도배'} 마감)`, '인', '1.5', '', '', ''))
    }
    if (has(living.ceiling, '우물천장 시공')) {
      carpRows.push(r(' - 거실 우물천장 T5 간접 등박스 생성', '인', '1.5', '', '', ''))
    }
  }

  if (overall && any(overall.doorFrame, '9mm 필름리폼', '철거+생성')) {
    carpRows.push(r(` - 문틀 ${overall.doorFrame}`, '인', '1', '', '', ''))
  }

  if (carpRows.length > 0) {
    rows.push(h('5. 목공사'))
    rows.push(...carpRows)
    rows.push(r(' - 몰딩 / 걸레받이', '인', '2', '', '', ''))
    rows.push(r(' - 자재비용', '식', '1', '800,000', '', ''))
    rows.push(r(' - 인건비용', '인', '7', '350,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 6. 필름 공사
  // ──────────────────────────────────────────
  const filmRows = []

  if (entrance) {
    if (any(entrance.middleDoor, '필름')) filmRows.push(r(' - 방화문 / 현관문 필름'))
    if (any(entrance.shoeRack, '필름')) filmRows.push(r(' - 신발장 필름'))
    if (any(entrance.wallAction, '필름')) filmRows.push(r(' - 현관 벽체 필름'))
  }

  if (overall) {
    if (has(overall.doorLeaf, '필름리폼')) filmRows.push(r(' - 각 방 문짝 필름리폼', '인', '2', '', '', '영림/삼성/LG/현대'))
    if (has(overall.window, '필름리폼')) filmRows.push(r(' - 샷시 필름리폼', '인', '5', '', '', ''))
  }

  if (filmRows.length > 0) {
    rows.push(h('6. 필름 공사'))
    rows.push(...filmRows)
    rows.push(r(' - 자재비용', '식', '1', '', '', ''))
    rows.push(r(' - 인건비용', '인', '8', '300,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 7. 타일 공사
  // ──────────────────────────────────────────
  const tileRows = []

  if (entrance && any(entrance.floor, '바닥 타일')) {
    tileRows.push(r(' - 현관 바닥 타일', '덧방', '', '', '', ''))
  }

  if (kitchen) {
    if (any(kitchen.wallTile, '철거+시공', '덧방')) {
      tileRows.push(r(` - 주방 싱크 벽 타일 (${kitchen.wallTile}${kitchen.wallTileSize ? ' ' + kitchen.wallTileSize : ''})`, '덧방', '', '', '', ''))
    }
  }

  if (tileRows.length > 0) {
    rows.push(h('7. 타일 공사'))
    rows.push(...tileRows)
    rows.push(r(' - 자재비용', '식', '1', '', '', ''))
    rows.push(r(' - 인건비용', '인', '3', '300,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 8. 욕실 공사
  // ──────────────────────────────────────────
  for (const bth of [bathroom1, bathroom2]) {
    if (!bth || has(bth.demo, '해당없음')) continue
    const label = bth.label || '욕실'
    rows.push(h(rows.filter((r) => r.type === 'header').length + '. ' + `욕실 공사 (${label})`))
    rows.push(r(` - ${label}`, bth.demo?.includes('전체') ? '전체철거+방수' : '덧방', '', '', '', '도기/수전 변경 시 변동금액 적용'))
    if (bth.tileSize && !has(bth.tileSize, '직접입력')) rows.push(r(` : 타일 ${bth.tileSize}`))
    arr(bth.ceiling).forEach((c) => rows.push(r(` : ${c}`)))
    arr(bth.fixtures).forEach((f) => rows.push(r(` : ${f}`)))
  }

  // 욕실 공사 섹션 번호 재정렬은 renumberHeaders가 처리

  // ──────────────────────────────────────────
  // 9. 도배
  // ──────────────────────────────────────────
  if (overall && !has(overall.wallpaper, '해당없음') && overall.wallpaper) {
    rows.push(h('9. 도배'))
    const brand = overall.wallpaperBrand && !has(overall.wallpaperBrand, '직접입력') ? overall.wallpaperBrand : ''
    rows.push(r(` - ${overall.wallpaper} 도배${brand ? ' (' + brand + ')' : ''}`, '평', info?.area?.replace(/[^0-9]/g, '') || '', '', '', brand))
    rows.push(r(' - 인건비 / 자재비 포함'))
  }

  // ──────────────────────────────────────────
  // 10. 마루
  // ──────────────────────────────────────────
  if (overall && any(overall.floor, '마루 시공', '장판 시공')) {
    rows.push(h('10. 마루'))
    const prod = overall.floorProduct && !has(overall.floorProduct, '직접입력') ? overall.floorProduct : ''
    rows.push(r(` - ${overall.floor}${prod ? ' - ' + prod : ''}`, '평', info?.area?.replace(/[^0-9]/g, '') || '', '', '', prod))
    rows.push(r(' - 시공비, 자재비, 로스분 포함'))
  }

  // ──────────────────────────────────────────
  // 11. 중문
  // ──────────────────────────────────────────
  if (entrance && has(entrance.middleDoor, '철거+제작')) {
    rows.push(h('11. 중문'))
    rows.push(r(` - ${entrance.middleDoorType || '중문'} 제작`, '개소', '1', '1,200,000', '', ''))
  }

  // ──────────────────────────────────────────
  // 12. 주방 가구
  // ──────────────────────────────────────────
  const furnitureRows = []

  if (entrance) {
    if (has(entrance.shoeRack, '제작')) {
      const opts = arr(entrance.shoeRackOpts).join(', ')
      furnitureRows.push(r(` - 신발장 제작${opts ? ' (' + opts + ')' : ''}`, '개소', '1', '950,000', '', ''))
    }
  }

  if (kitchen) {
    if (has(kitchen.upper, '제작')) furnitureRows.push(r(' - 씽크대 상부장 제작', '개소', '1', '1,800,000', '', ''))
    if (has(kitchen.lower, '제작')) furnitureRows.push(r(' - 씽크대 하부장 제작', '개소', '1', '', '', ''))
    if (has(kitchen.fridge, '제작')) furnitureRows.push(r(' - 냉장고장 제작', '개소', '1', '950,000', '', ''))
    if (any(kitchen.island, '제작')) furnitureRows.push(r(' - 아일랜드 제작', '개소', '1', '', '', ''))
    if (has(kitchen.homebar, '홈바 제작')) furnitureRows.push(r(' - 홈바 제작', '개소', '1', '750,000', '', ''))
    if (any(kitchen.hood, '교체(빌트인)', '교체(일반)')) furnitureRows.push(r(` - 후드 ${kitchen.hood}`, '개', '1', '250,000', '', ''))
    if (any(kitchen.sink, '씽크볼 교체', '씽크볼+수전 교체')) furnitureRows.push(r(` - ${kitchen.sink}`, '개', '1', '', '', ''))
  }

  arr(rooms).forEach((room, i) => {
    if (!room) return
    if (any(room.closet, '제작')) {
      furnitureRows.push(r(` - ${room.label || `방 ${i + 1}`} 붙박이장 제작`, '자', '', '140,000', '', ''))
    }
    if (has(room.dressRoom, '제작')) {
      furnitureRows.push(r(` - ${room.label || `방 ${i + 1}`} 드레스룸 제작`, '식', '1', '', '', ''))
    }
  })

  if (furnitureRows.length > 0) {
    rows.push(h('12. 씽크 및 가구'))
    rows.push(...furnitureRows)
  }

  // ──────────────────────────────────────────
  // 13. 기타 공사
  // ──────────────────────────────────────────
  rows.push(h('13. 기타 공사'))
  rows.push(r(' - 승강기 보양료', '식', '1', '200,000', '', ''))
  rows.push(r(' - 철물비용 (도어첵, 실리콘 등)', '', '', '300,000', '', ''))
  rows.push(r(' - 감리경비 (자재운임비/곰방비 등)', '%', '2', '', '', ''))

  // ──────────────────────────────────────────
  // 별도사항
  // ──────────────────────────────────────────
  extras.push({ id: nextId(), text: '- 승강기 사용료 고객님 관리사무소 납부' })
  extras.push({ id: nextId(), text: '- 인터폰, 도어락 별도' })
  if (schedule?.budget) extras.push({ id: nextId(), text: `- 예산: ${schedule.budget}` })
  extras.push({ id: nextId(), text: '- VAT 별도' })

  // ──────────────────────────────────────────
  // 견적서 헤더 정보
  // ──────────────────────────────────────────
  const info_ = {
    date: (() => {
      const d = new Date()
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
    })(),
    client: info?.address || '',
    constructionStart: '',
    constructionEnd: schedule?.period || '',
    registrationNumber: '',
    companyName: '',
    manager: '',
    address: '',
    industry: '건설업',
    type: '인테리어',
    phone: '',
    fax: '',
  }

  return { info: info_, rows, extras }
}
