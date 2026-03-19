// 현장 메모 폼 섹션 + 필드 정의
// type: 'radio' | 'multi' | 'text' | 'count' | 'textarea'
// radio  → 하나만 선택 (버튼 그룹)
// multi  → 여러 개 선택 (토글 칩)
// text   → 텍스트 입력
// count  → 숫자 카운터
// textarea → 메모

export const INITIAL_FORM = {
  info: {
    address: '', date: '', area: '', roomCount: '3',
    constructionPeriod: '', moveInDate: '', budget: '',
  },
  entrance: {
    floor: [], shoeRack: '', shoeRackOpts: [],
    opposite: '', middleDoor: '', middleDoorType: '',
    doorAction: '', wallAction: [], memo: '',
  },
  bathroom1: {
    label: '공용 욕실',
    demo: '', tileSize: '', ceiling: [],
    shower: '', partition: '', zenDai: [],
    fixtures: [], memo: '',
  },
  bathroom2: {
    label: '안방 욕실',
    demo: '', tileSize: '', ceiling: [],
    shower: '', partition: '', zenDai: [],
    fixtures: [], memo: '',
  },
  rooms: [
    { label: '방 1', balcony: '', closet: '', dressRoom: '', door: '', lighting: [], memo: '' },
    { label: '방 2', balcony: '', closet: '', dressRoom: '', door: '', lighting: [], memo: '' },
    { label: '방 3', balcony: '', closet: '', dressRoom: '', door: '', lighting: [], memo: '' },
  ],
  living: {
    artwall: '', tvWall: '', ceiling: '', ceilingType: [],
    lighting: [], fan: [], aircon: [],
    balcony: '', balconyTile: '', memo: '',
  },
  kitchen: {
    wallTile: '', wallTileSize: '', pantry: '',
    upper: '', lower: '', hood: '',
    fridge: '', island: '', homebar: '',
    sink: '', faucet: '',
    subKitchen: [], balcony: '', memo: '',
  },
  overall: {
    wallpaper: '', wallpaperBrand: '',
    floor: '', floorProduct: '',
    doorFrame: '', doorLeaf: '',
    window: '', film: [],
    molding: '', lighting: [], memo: '',
  },
  schedule: {
    period: '', moveIn: '', budget: '', note: '',
  },
}

export const SECTIONS = [
  {
    id: 'info',
    title: '기본 정보',
    icon: '📋',
    groups: [
      {
        label: '현장 주소',
        fields: [
          { id: 'address', type: 'text', placeholder: '예) 창원시 가음더샵 304동 601호', full: true },
        ],
      },
      {
        label: '방문일',
        fields: [
          { id: 'date', type: 'text', placeholder: '예) 2026-03-19' },
        ],
      },
      {
        label: '평수 / 방 수',
        fields: [
          { id: 'area', type: 'text', placeholder: '예) 34평', unit: '평' },
          { id: 'roomCount', type: 'radio', options: ['1', '2', '3', '4'], label: '방 수' },
        ],
      },
    ],
  },

  {
    id: 'entrance',
    title: '현관',
    icon: '🚪',
    groups: [
      {
        label: '바닥',
        fields: [
          { id: 'floor', type: 'multi', options: ['디딤석 단', '바닥 타일'] },
        ],
      },
      {
        label: '신발장',
        fields: [
          { id: 'shoeRack', type: 'radio', options: ['보존(시공X)', '필름', '제작'] },
          { id: 'shoeRackOpts', type: 'multi', options: ['행잉', '하부간접조명', '선반', '벤치'], sub: true },
        ],
      },
      {
        label: '신발장 맞은편',
        fields: [
          { id: 'opposite', type: 'radio', options: ['없음', '펜트리', '수납장', '신발장'] },
        ],
      },
      {
        label: '중문',
        fields: [
          { id: 'middleDoor', type: 'radio', options: ['보존(시공X)', '필름', '철거', '철거+제작'] },
          {
            id: 'middleDoorType', type: 'radio', sub: true,
            options: ['비대칭양개형', '대칭양개형', '스윙형', '원슬라이딩', '3연동슬라이딩'],
          },
        ],
      },
      {
        label: '문짝',
        fields: [
          { id: 'doorAction', type: 'radio', options: ['보존(시공X)', '필름', '교체(일반)', '교체(거울)'] },
        ],
      },
      {
        label: '벽',
        fields: [
          { id: 'wallAction', type: 'multi', options: ['필름', '도배', '전신거울'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'bathroom1',
    title: '욕실 (공용)',
    icon: '🚿',
    groups: [
      {
        label: '철거 방식',
        fields: [
          {
            id: 'demo', type: 'radio',
            options: ['전체철거(방수1·2·3차)', '타일제외전체철거', '부분철거', '해당없음'],
          },
        ],
      },
      {
        label: '타일',
        fields: [
          { id: 'tileSize', type: 'radio', options: ['200×200', '300×300', '600×600', '600×1200', '직접입력'] },
        ],
      },
      {
        label: '천장 / 환풍기',
        fields: [
          { id: 'ceiling', type: 'multi', options: ['SMC 천장', '휴젠뜨 설치', '환풍기 교체'] },
        ],
      },
      {
        label: '젠다이',
        fields: [
          { id: 'zenDai', type: 'multi', options: ['긴ㅡ자형', 'T자형', 'ㄱ자형', '해당없음'] },
        ],
      },
      {
        label: '샤워 / 욕조',
        fields: [
          { id: 'shower', type: 'radio', options: ['샤워형태', '욕조+에이프런', '해당없음'] },
          { id: 'partition', type: 'radio', sub: true, options: ['반조적+반유리', '풀조적', '폼세라믹', '샤워부스', '샤워파티션'] },
        ],
      },
      {
        label: '위생도기 / 수전',
        fields: [
          { id: 'fixtures', type: 'multi', options: ['세면대 교체', '양변기 교체', '샤워수전 교체', '세면수전 교체', '거울장 교체', '액세서리 교체'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'bathroom2',
    title: '욕실 (안방)',
    icon: '🛁',
    groups: [
      {
        label: '철거 방식',
        fields: [
          {
            id: 'demo', type: 'radio',
            options: ['전체철거(방수1·2·3차)', '타일제외전체철거', '부분철거', '해당없음'],
          },
        ],
      },
      {
        label: '타일',
        fields: [
          { id: 'tileSize', type: 'radio', options: ['200×200', '300×300', '600×600', '600×1200', '직접입력'] },
        ],
      },
      {
        label: '천장 / 환풍기',
        fields: [
          { id: 'ceiling', type: 'multi', options: ['SMC 천장', '휴젠뜨 설치', '환풍기 교체'] },
        ],
      },
      {
        label: '젠다이',
        fields: [
          { id: 'zenDai', type: 'multi', options: ['긴ㅡ자형', 'T자형', 'ㄱ자형', '해당없음'] },
        ],
      },
      {
        label: '샤워 / 욕조',
        fields: [
          { id: 'shower', type: 'radio', options: ['샤워형태', '욕조+에이프런', '해당없음'] },
          { id: 'partition', type: 'radio', sub: true, options: ['반조적+반유리', '풀조적', '폼세라믹', '샤워부스', '샤워파티션'] },
        ],
      },
      {
        label: '위생도기 / 수전',
        fields: [
          { id: 'fixtures', type: 'multi', options: ['세면대 교체', '양변기 교체', '샤워수전 교체', '세면수전 교체', '거울장 교체', '액세서리 교체'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'rooms',
    title: '방',
    icon: '🛏',
    isRooms: true, // 방 수에 따라 탭 분리
    groups: [
      {
        label: '베란다',
        fields: [
          { id: 'balcony', type: 'radio', options: ['없음', '확장', '탄성+바닥타일', '건식 확장'] },
        ],
      },
      {
        label: '붙박이장',
        fields: [
          { id: 'closet', type: 'radio', options: ['없음', '보존(시공X)', '문짝필름', '문짝교체', '철거', '제작'] },
        ],
      },
      {
        label: '드레스룸 / 화장대',
        fields: [
          { id: 'dressRoom', type: 'radio', options: ['없음', '보존', '제작'] },
        ],
      },
      {
        label: '방화문 / 문짝',
        fields: [
          { id: 'door', type: 'radio', options: ['없음', '방화문필름', '문짝필름', '문짝교체'] },
        ],
      },
      {
        label: '조명',
        fields: [
          { id: 'lighting', type: 'multi', options: ['LED 전등(직부등)', '다운라이트', '커튼박스 간접조명', '콘센트 증설'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'living',
    title: '거실',
    icon: '🛋',
    groups: [
      {
        label: '아트월',
        fields: [
          { id: 'artwall', type: 'radio', options: ['보존(시공X)', '철거', '필름 벽체 생성'] },
        ],
      },
      {
        label: 'TV 벽체',
        fields: [
          { id: 'tvWall', type: 'radio', options: ['없음', 'TV 반매립 MDF 벽체(필름)', 'TV 반매립 MDF 벽체(도배)'] },
        ],
      },
      {
        label: '천장',
        fields: [
          { id: 'ceiling', type: 'radio', options: ['현상유지', '천장 평탄화', '우물천장 시공'] },
          { id: 'ceilingType', type: 'multi', sub: true, options: ['T5 간접조명', '커튼박스', '단내림'] },
        ],
      },
      {
        label: '조명 / 설비',
        fields: [
          { id: 'lighting', type: 'multi', options: ['다운라이트', 'LED 전등', 'T5 간접조명', '실링팬 설치'] },
          { id: 'aircon', type: 'multi', options: ['시스템에어컨 설치'], sub: true },
        ],
      },
      {
        label: '베란다',
        fields: [
          { id: 'balcony', type: 'radio', options: ['없음', '확장', '탄성+바닥타일', '가벽/날개벽 철거'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'kitchen',
    title: '주방',
    icon: '🍳',
    groups: [
      {
        label: '싱크대 벽 타일',
        fields: [
          { id: 'wallTile', type: 'radio', options: ['보존(시공X)', '철거+시공', '덧방'] },
          { id: 'wallTileSize', type: 'radio', sub: true, options: ['200×200', '300×600', '300×300', '직접입력'] },
        ],
      },
      {
        label: '상부장',
        fields: [
          { id: 'upper', type: 'radio', options: ['보존(시공X)', '문짝필름', '철거', '제작'] },
        ],
      },
      {
        label: '하부장',
        fields: [
          { id: 'lower', type: 'radio', options: ['보존(시공X)', '문짝필름', '철거', '제작'] },
        ],
      },
      {
        label: '냉장고장',
        fields: [
          { id: 'fridge', type: 'radio', options: ['없음', '보존(시공X)', '문짝필름', '철거', '제작'] },
        ],
      },
      {
        label: '아일랜드',
        fields: [
          { id: 'island', type: 'radio', options: ['없음', '보존', '상판교체', '철거', '제작'] },
        ],
      },
      {
        label: '홈바 / 펜트리',
        fields: [
          { id: 'homebar', type: 'radio', options: ['없음', '홈바 제작', '펜트리 보존', '펜트리 제작'] },
        ],
      },
      {
        label: '후드',
        fields: [
          { id: 'hood', type: 'radio', options: ['보존', '교체(빌트인)', '교체(일반)'] },
        ],
      },
      {
        label: '씽크볼 / 수전',
        fields: [
          { id: 'sink', type: 'radio', options: ['보존', '씽크볼 교체', '씽크볼+수전 교체'] },
        ],
      },
      {
        label: '보조주방 / 세탁실',
        fields: [
          { id: 'subKitchen', type: 'multi', options: ['보조싱크 보존', '보조싱크 리폼', '보조싱크 철거', '세탁기 단 연장', '베란다 탄성+타일'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'overall',
    title: '전체 마감',
    icon: '🎨',
    groups: [
      {
        label: '도배',
        fields: [
          { id: 'wallpaper', type: 'radio', options: ['집 전체', '공용부만', '각 방만', '해당없음'] },
          { id: 'wallpaperBrand', type: 'radio', sub: true, options: ['LX 디아망', 'LX 베스띠', 'LX Z:IN', '삼성 제지', '직접입력'] },
        ],
      },
      {
        label: '마루 / 바닥재',
        fields: [
          { id: 'floor', type: 'radio', options: ['마루 시공', '장판 시공', '타일 시공', '해당없음'] },
          { id: 'floorProduct', type: 'radio', sub: true, options: ['구정마루', 'LG 하우시스', '동화자연마루', '직접입력'] },
        ],
      },
      {
        label: '문틀 / 문짝',
        fields: [
          { id: 'doorFrame', type: 'radio', options: ['현상유지', '9mm 필름리폼', '철거+생성'] },
          { id: 'doorLeaf', type: 'radio', sub: true, options: ['현상유지', '필름리폼', '교체'] },
        ],
      },
      {
        label: '샷시',
        fields: [
          { id: 'window', type: 'radio', options: ['현상유지', '필름리폼', '교체'] },
        ],
      },
      {
        label: '조명 (집 전체)',
        fields: [
          { id: 'lighting', type: 'multi', options: ['다운라이트 교체', 'LED 전등 교체', '콘센트/스위치 교체'] },
        ],
      },
      {
        label: '몰딩 / 걸레받이',
        fields: [
          { id: 'molding', type: 'radio', options: ['현상유지', '시공', '해당없음'] },
        ],
      },
      { label: '메모', fields: [{ id: 'memo', type: 'textarea' }] },
    ],
  },

  {
    id: 'schedule',
    title: '일정 / 예산',
    icon: '📅',
    groups: [
      {
        label: '희망 공사기간',
        fields: [{ id: 'period', type: 'text', placeholder: '예) 3월 말 ~ 4월 초 (약 3주)' }],
      },
      {
        label: '입주 희망일',
        fields: [{ id: 'moveIn', type: 'text', placeholder: '예) 2026-05-01' }],
      },
      {
        label: '예산',
        fields: [{ id: 'budget', type: 'text', placeholder: '예) 3,000만원 ~ 4,000만원' }],
      },
      {
        label: '전체 메모',
        fields: [{ id: 'note', type: 'textarea' }],
      },
    ],
  },
]
