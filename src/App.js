import React, { useState, useMemo } from 'react';
import './App.css';
import {
  PRICE_NOTICE,
  CONSULTATION_CONFIG,
  MAJOR_PROFILES,
  GAMING_PRESETS,
  DESKTOP_PARTS,
  MAJOR_DESKTOP_PRESETS,
  LAPTOP_LIST,
} from './data/hardwareData';
import {
  formatKRW,
  analyzeDesktopBuild,
  evaluateLaptop,
  buildInquiryTemplate,
} from './utils/analyzer';

const PART_ROWS = [
  { key: 'cpu', label: 'CPU' },
  { key: 'cooler', label: 'CPU 쿨러' },
  { key: 'mb', label: '메인보드' },
  { key: 'ram', label: '메모리 (RAM)' },
  { key: 'gpu', label: '그래픽카드 (GPU)' },
  { key: 'ssd', label: '저장장치 (SSD)' },
  { key: 'psu', label: '파워서플라이' },
  { key: 'case', label: '케이스' },
];

function App() {
  // 상단 탭 상태 ('desktop' | 'laptop' | 'compare')
  const [activeTab, setActiveTab] = useState('desktop');

  // 공통 조건 상태 (동서대 전공 프로필 + 게이밍 목표)
  const [majorId, setMajorId] = useState('sw');
  const [gamingId, setGamingId] = useState('casual-fhd');

  // 데스크톱 부품 선택 및 사용자 커스텀 단가
  const [selectedIds, setSelectedIds] = useState({
    cpu: 'cpu-7500f',
    cooler: 'cooler-single',
    mb: 'mb-b650m',
    ram: 'ram-32',
    gpu: 'gpu-5060ti',
    ssd: 'ssd-1tb',
    psu: 'psu-600',
    case: 'case-mesh',
  });
  const [customPrices, setCustomPrices] = useState({});

  // 랩탑 필터 상태 (예산, 무게, 소음, OS)
  const [maxBudget, setMaxBudget] = useState(3000000);
  const [maxWeight, setMaxWeight] = useState(2.5);
  const [quietOnly, setQuietOnly] = useState(false);
  const [osFilter, setOsFilter] = useState('ALL');

  // 비교함 상태 (최대 3개)
  const [compareItems, setCompareItems] = useState([]);

  // 1:1 견적 문의 모달 상태
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultText, setConsultText] = useState('');

  // 상태 안내 토스트 메시지
  const [statusMsg, setStatusMsg] = useState('');

  const showToast = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2600);
  };

  const currentMajor = useMemo(
    () => MAJOR_PROFILES.find((m) => m.id === majorId) || MAJOR_PROFILES[0],
    [majorId]
  );

  const currentGaming = useMemo(
    () => GAMING_PRESETS.find((g) => g.id === gamingId) || GAMING_PRESETS[0],
    [gamingId]
  );

  // 선택된 부품 객체 매핑
  const selectedParts = useMemo(() => {
    const findPart = (key) =>
      DESKTOP_PARTS[key].find((item) => item.id === selectedIds[key]) ||
      DESKTOP_PARTS[key][0];

    return {
      cpu: findPart('cpu'),
      cooler: findPart('cooler'),
      mb: findPart('mb'),
      ram: findPart('ram'),
      gpu: findPart('gpu'),
      ssd: findPart('ssd'),
      psu: findPart('psu'),
      caseItem: findPart('case'),
    };
  }, [selectedIds]);

  // 데스크톱 분석 결과
  const desktopAnalysis = useMemo(
    () =>
      analyzeDesktopBuild({
        parts: selectedParts,
        customPrices,
        majorId,
        gamingId,
      }),
    [selectedParts, customPrices, majorId, gamingId]
  );

  // 현재 전공 + 게이밍 조건 기반 원클릭 추천 프리셋 적용
  const applyRecommendedPreset = () => {
    if (currentGaming.isInquiryOnly) {
      openConsultModal('desktop');
      return;
    }

    let basePreset;
    if (currentGaming.defaultBuild) {
      basePreset = { ...currentGaming.defaultBuild };
      // 전공 최소 램이 32GB 이상이면 게이밍 프리셋에도 32GB 자동 반영
      if (currentMajor.minRamGb >= 32) {
        basePreset.ram = 'ram-32';
      }
    } else {
      basePreset = { ...MAJOR_DESKTOP_PRESETS[currentMajor.desktopPresetId] };
    }

    setSelectedIds(basePreset);
    setCustomPrices({});
    showToast('선택한 전공·게이밍 조건에 맞는 추천 견적을 적용했습니다.');
  };

  // 부품 변경 핸들러
  const handlePartChange = (key, newId) => {
    setSelectedIds((prev) => ({ ...prev, [key]: newId }));
    setCustomPrices((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // 부품 단가 직접 수정 핸들러
  const handleCustomPriceChange = (key, rawVal) => {
    const cleaned = rawVal.replace(/[^0-9]/g, '');
    setCustomPrices((prev) => ({
      ...prev,
      [key]: cleaned === '' ? '' : Number(cleaned),
    }));
  };

  const resetCustomPrices = () => {
    setCustomPrices({});
    showToast('모든 부품 단가를 기준 평균가로 초기화했습니다.');
  };

  // 데스크톱 요약 문자열 생성
  const getDesktopSummaryText = () => {
    return `${selectedParts.cpu.name} / ${selectedParts.gpu.name} / ${selectedParts.ram.name} / ${selectedParts.ssd.name} / ${selectedParts.psu.name} (총 ${formatKRW(
      desktopAnalysis.totalPrice
    )})`;
  };

  // 데스크톱 상세 견적 텍스트 복사
  const copyDesktopSpec = () => {
    const lines = [
      `[SpecMatch 데스크톱 견적서]`,
      `전공 프로필: ${currentMajor.label}`,
      `게이밍 목표: ${currentGaming.label}`,
      `--------------------------------`,
      ...PART_ROWS.map((row) => {
        const partObj = row.key === 'case' ? selectedParts.caseItem : selectedParts[row.key];
        const priceVal = customPrices[row.key] ?? partObj.price;
        return `- ${row.label}: ${partObj.name} (${formatKRW(priceVal)})`;
      }),
      `--------------------------------`,
      `총 예상 금액: ${formatKRW(desktopAnalysis.totalPrice)}`,
      `예상 피크 전력: ${desktopAnalysis.estimatedWatt}W / 적합도 점수: ${desktopAnalysis.score}점`,
      PRICE_NOTICE,
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    showToast('데스크톱 견적 텍스트가 클립보드에 복사되었습니다.');
  };

  // 비교함 추가 (데스크톱)
  const addDesktopToCompare = () => {
    if (compareItems.length >= 3) {
      showToast('비교함은 최대 3개까지 담을 수 있습니다.');
      return;
    }
    const newItem = {
      uid: `dt-${Date.now()}`,
      type: '데스크톱',
      name: `${selectedParts.cpu.name.split(' ')[2] || selectedParts.cpu.name} + ${
        selectedParts.gpu.id === 'gpu-none'
          ? '내장그래픽'
          : selectedParts.gpu.name.replace('NVIDIA GeForce ', '')
      }`,
      price: desktopAnalysis.totalPrice,
      score: desktopAnalysis.score,
      cpu: selectedParts.cpu.name,
      gpu: selectedParts.gpu.name,
      ramSsd: `RAM ${selectedParts.ram.gb}GB / SSD ${selectedParts.ssd.gb >= 1000 ? `${selectedParts.ssd.gb / 1000}TB` : `${selectedParts.ssd.gb}GB`}`,
      physical: `피크 ${desktopAnalysis.estimatedWatt}W / 파워 ${selectedParts.psu.watt}W / ${selectedParts.caseItem.name.split(' ')[0]}`,
      warningCount: desktopAnalysis.warnings.length,
    };
    setCompareItems((prev) => [...prev, newItem]);
    showToast('현재 데스크톱 견적을 비교함에 담았습니다.');
  };

  // 비교함 추가 (랩탑)
  const addLaptopToCompare = (laptop, evaluation) => {
    if (compareItems.some((item) => item.uid === laptop.id)) {
      showToast('이미 비교함에 담긴 노트북입니다.');
      return;
    }
    if (compareItems.length >= 3) {
      showToast('비교함은 최대 3개까지 담을 수 있습니다.');
      return;
    }
    const newItem = {
      uid: laptop.id,
      type: `노트북 (${laptop.os})`,
      name: laptop.name,
      price: laptop.price,
      score: evaluation.score,
      cpu: laptop.cpuSpec,
      gpu: laptop.gpuSpec,
      ramSsd: `RAM ${laptop.ramGb}GB / SSD ${laptop.ssdGb >= 1000 ? `${laptop.ssdGb / 1000}TB` : `${laptop.ssdGb}GB`}`,
      physical: `${laptop.weightKg}kg / ${laptop.screenInch}인치 / 소음: ${laptop.noiseLevel}`,
      warningCount: evaluation.warnings.length,
    };
    setCompareItems((prev) => [...prev, newItem]);
    showToast(`${laptop.name} 모델을 비교함에 담았습니다.`);
  };

  const removeCompareItem = (uid) => {
    setCompareItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  const copyCompareTable = () => {
    if (compareItems.length === 0) return;
    const lines = [
      `[SpecMatch 후보 비교표]`,
      `기준 전공: ${currentMajor.label} / 게이밍: ${currentGaming.label}`,
      `================================`,
      ...compareItems.map(
        (item, idx) =>
          `${idx + 1}. [${item.type}] ${item.name}\n   - 가격: ${formatKRW(item.price)} | 적합도: ${item.score}점\n   - 주요 스펙: ${item.cpu} / ${item.gpu} / ${item.ramSsd}\n   - 전력·물리: ${item.physical}`
      ),
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    showToast('비교함 요약 텍스트가 복사되었습니다.');
  };

  // 1:1 견적 문의 모달 열기
  const openConsultModal = (mode, specificLaptopName = '') => {
    const template = buildInquiryTemplate({
      mode,
      majorId,
      gamingId,
      desktopSummary: mode === 'desktop' ? getDesktopSummaryText() : '',
      laptopName: specificLaptopName,
    });
    setConsultText(template);
    setConsultOpen(true);
  };

  // 랩탑 필터링 및 평가 리스트
  const evaluatedLaptops = useMemo(() => {
    return LAPTOP_LIST.filter((lap) => {
      if (lap.price > maxBudget) return false;
      if (osFilter !== 'ALL' && lap.os !== osFilter) return false;
      return true;
    })
      .map((lap) => ({
        laptop: lap,
        evalResult: evaluateLaptop(lap, {
          majorId,
          gamingId,
          maxWeight,
          quietOnly,
        }),
      }))
      .sort((a, b) => b.evalResult.score - a.evalResult.score);
  }, [maxBudget, osFilter, majorId, gamingId, maxWeight, quietOnly]);

  // 랩탑 물리적 트레이드오프 경고 조건
  const showTradeoffNotice =
    (majorId === 'game3d' ||
      majorId === 'cad' ||
      (currentGaming.minGpuTier && currentGaming.minGpuTier >= 2)) &&
    (maxWeight <= 1.6 || quietOnly);

  return (
    <div className="sm-container">
      {/* 상단 헤더 */}
      <header className="sm-header">
        <div className="sm-brand">
          <h1>SpecMatch</h1>
          <span className="sm-subtitle">동서대 전공 · 게이밍 PC 견적 및 랩탑 비교기</span>
        </div>
        <button
          type="button"
          className="sm-btn sm-btn-primary"
          onClick={() => openConsultModal(activeTab === 'laptop' ? 'laptop' : 'desktop')}
        >
          1:1 퍼스널 견적 문의
        </button>
      </header>

      {/* 토스트 알림 */}
      {statusMsg && <div className="sm-toast">{statusMsg}</div>}

      {/* 공통 조건 선택 패널 (전공 + 게이밍) */}
      <section className="sm-condition-bar">
        <div className="sm-field">
          <label htmlFor="major-select">1. 동서대학교 전공 프로필 선택</label>
          <select
            id="major-select"
            value={majorId}
            onChange={(e) => setMajorId(e.target.value)}
          >
            {MAJOR_PROFILES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="sm-meta-line">
            <strong>해당 학과:</strong> {currentMajor.departments.join(' · ')}
          </div>
          <div className="sm-meta-line">
            <strong>주요 툴:</strong> {currentMajor.tools}
          </div>
        </div>

        <div className="sm-field">
          <label htmlFor="gaming-select">2. 게이밍 병행 목표 선택</label>
          <select
            id="gaming-select"
            value={gamingId}
            onChange={(e) => setGamingId(e.target.value)}
          >
            {GAMING_PRESETS.map((g) => (
              <option key={g.id} value={g.id}>
                [{g.group}] {g.label}
              </option>
            ))}
          </select>
          <div className="sm-meta-line">
            <strong>안내:</strong> {currentGaming.note}
          </div>
          {currentGaming.isInquiryOnly && (
            <button
              type="button"
              className="sm-btn sm-btn-accent sm-mt-6"
              onClick={() => openConsultModal('desktop')}
            >
              커스텀 / 목록 외 사양 1:1 문의하기
            </button>
          )}
        </div>
      </section>

      {/* 메인 탭 네비게이션 */}
      <nav className="sm-tabs">
        <button
          type="button"
          className={`sm-tab ${activeTab === 'desktop' ? 'active' : ''}`}
          onClick={() => setActiveTab('desktop')}
        >
          조립 데스크톱 견적 계산기
        </button>
        <button
          type="button"
          className={`sm-tab ${activeTab === 'laptop' ? 'active' : ''}`}
          onClick={() => setActiveTab('laptop')}
        >
          노트북 (랩탑) 스펙 · 물리 지표 비교
        </button>
        <button
          type="button"
          className={`sm-tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          비교함 ({compareItems.length}/3)
        </button>
      </nav>

      {/* ==================== TAB 1: 데스크톱 견적 ==================== */}
      {activeTab === 'desktop' && (
        <main className="sm-desktop-grid">
          <div className="sm-panel">
            <div className="sm-panel-head">
              <h2>부품 구성 및 단가 설정 (AM5 / DDR5)</h2>
              <div className="sm-btn-group">
                <button
                  type="button"
                  className="sm-btn sm-btn-accent"
                  onClick={applyRecommendedPreset}
                >
                  조건 맞춤 프리셋 불러오기
                </button>
                {Object.keys(customPrices).length > 0 && (
                  <button
                    type="button"
                    className="sm-btn"
                    onClick={resetCustomPrices}
                  >
                    단가 초기화
                  </button>
                )}
              </div>
            </div>

            <div className="sm-notice-strip">{PRICE_NOTICE}</div>

            <table className="sm-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>분류</th>
                  <th style={{ width: '58%' }}>규격 및 모델 등급 선택</th>
                  <th style={{ width: '26%' }}>예상 단가 (직접 수정)</th>
                </tr>
              </thead>
              <tbody>
                {PART_ROWS.map((row) => {
                  const list = DESKTOP_PARTS[row.key];
                  const selectedObj =
                    row.key === 'case' ? selectedParts.caseItem : selectedParts[row.key];
                  const displayPrice =
                    customPrices[row.key] !== undefined
                      ? customPrices[row.key]
                      : selectedObj.price;

                  return (
                    <tr key={row.key}>
                      <td className="sm-cell-label">{row.label}</td>
                      <td>
                        <select
                          className="sm-select-full"
                          value={selectedIds[row.key]}
                          onChange={(e) => handlePartChange(row.key, e.target.value)}
                        >
                          {list.map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.name} ({formatKRW(part.price)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="sm-price-input-wrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={displayPrice}
                            onChange={(e) =>
                              handleCustomPriceChange(row.key, e.target.value)
                            }
                            aria-label={`${row.label} 단가`}
                          />
                          <span>원</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 우측 진단 리포트 패널 */}
          <aside className="sm-panel sm-summary-panel">
            <div className="sm-panel-head">
              <h2>실시간 견적 진단 리포트</h2>
            </div>

            <div className="sm-kpi-grid">
              <div className="sm-kpi-box">
                <span className="sm-kpi-label">총 예상 금액</span>
                <strong className="sm-kpi-val">
                  {formatKRW(desktopAnalysis.totalPrice)}
                </strong>
              </div>
              <div className="sm-kpi-box">
                <span className="sm-kpi-label">목적 적합도</span>
                <strong className="sm-kpi-val">{desktopAnalysis.score} / 100</strong>
              </div>
              <div className="sm-kpi-box">
                <span className="sm-kpi-label">예상 피크 전력</span>
                <strong className="sm-kpi-val">
                  {desktopAnalysis.estimatedWatt}W / {selectedParts.psu.watt}W
                </strong>
              </div>
            </div>

            {/* 경고 목록 */}
            <div className="sm-diag-block">
              <h3>호환성 · 병목 경고 ({desktopAnalysis.warnings.length})</h3>
              {desktopAnalysis.warnings.length === 0 ? (
                <p className="sm-ok-text">
                  현재 선택한 전공·게이밍 조건에서 심각한 호환성 및 병목 경고가 없습니다.
                </p>
              ) : (
                <ul className="sm-alert-list warning">
                  {desktopAnalysis.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* 팁 목록 */}
            <div className="sm-diag-block">
              <h3>세부 가이드</h3>
              <ul className="sm-alert-list tip">
                {desktopAnalysis.tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>

            {/* 액션 버튼 */}
            <div className="sm-action-stack">
              <button
                type="button"
                className="sm-btn sm-btn-primary"
                onClick={addDesktopToCompare}
              >
                현재 견적 비교함에 담기
              </button>
              <button type="button" className="sm-btn" onClick={copyDesktopSpec}>
                견적서 텍스트 복사
              </button>
              <button
                type="button"
                className="sm-btn sm-btn-consult"
                onClick={() => openConsultModal('desktop')}
              >
                {CONSULTATION_CONFIG.buttonLabel}
              </button>
            </div>
          </aside>
        </main>
      )}

      {/* ==================== TAB 2: 랩탑 비교 ==================== */}
      {activeTab === 'laptop' && (
        <main className="sm-panel">
          <div className="sm-panel-head">
            <h2>노트북(랩탑) 필터 및 물리 지표 분석</h2>
            <span className="sm-count-badge">검색 결과 {evaluatedLaptops.length}건</span>
          </div>

          <div className="sm-filter-bar">
            <div className="sm-filter-item">
              <label htmlFor="budget-range">
                최대 예산: <strong>{formatKRW(maxBudget)}</strong>
              </label>
              <input
                id="budget-range"
                type="range"
                min="1200000"
                max="3500000"
                step="100000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
              />
            </div>

            <div className="sm-filter-item">
              <label htmlFor="weight-select">무게 상한 기준 (휴대성)</label>
              <select
                id="weight-select"
                value={maxWeight}
                onChange={(e) => setMaxWeight(Number(e.target.value))}
              >
                <option value={1.4}>1.4kg 이하 (매일 통학 초경량)</option>
                <option value={1.6}>1.6kg 이하 (표준 휴대)</option>
                <option value={2.0}>2.0kg 이하 (가끔 휴대)</option>
                <option value={2.5}>2.5kg 이하 (거치형 포함 전체)</option>
              </select>
            </div>

            <div className="sm-filter-item">
              <label htmlFor="os-select">운영체제 (OS)</label>
              <select
                id="os-select"
                value={osFilter}
                onChange={(e) => setOsFilter(e.target.value)}
              >
                <option value="ALL">전체 (Windows + macOS)</option>
                <option value="Windows">Windows 전용</option>
                <option value="macOS">macOS (맥북)</option>
              </select>
            </div>

            <div className="sm-filter-item sm-checkbox-item">
              <label>
                <input
                  type="checkbox"
                  checked={quietOnly}
                  onChange={(e) => setQuietOnly(e.target.checked)}
                />
                도서관 · 강의실 정숙성(저소음) 우선
              </label>
            </div>
          </div>

          {showTradeoffNotice && (
            <div className="sm-tradeoff-box">
              <strong>물리적 한계 안내:</strong> 고사양 작업(3D·CAD·외장 GPU 게이밍)과
              초경량·저소음을 동시에 충족하는 노트북은 발열 제어 한계로 가격이 230만 원
              이상 급등합니다. 예산이 한정적이라면 데스크톱 본체와 가성비 사무용 노트북으로
              이원화하는 구성을 권장합니다.
            </div>
          )}

          <div className="sm-laptop-list">
            {evaluatedLaptops.map(({ laptop, evalResult }) => (
              <article key={laptop.id} className="sm-laptop-row">
                <div className="sm-laptop-main">
                  <div className="sm-laptop-title-line">
                    <span className="sm-os-tag">{laptop.os}</span>
                    <h3>{laptop.name}</h3>
                    <span className="sm-score-pill">전공 적합도 {evalResult.score}점</span>
                  </div>
                  <p className="sm-laptop-note">{laptop.note}</p>

                  <div className="sm-spec-grid">
                    <div>
                      <strong>CPU/GPU:</strong> {laptop.cpuSpec} / {laptop.gpuSpec}
                    </div>
                    <div>
                      <strong>RAM/SSD:</strong> {laptop.ramGb}GB /{' '}
                      {laptop.ssdGb >= 1000
                        ? `${laptop.ssdGb / 1000}TB`
                        : `${laptop.ssdGb}GB`}
                    </div>
                    <div>
                      <strong>디스플레이:</strong> {laptop.display}
                    </div>
                  </div>

                  {/* 물리 지표 3요소: 무게 / 공간 / 소음 */}
                  <div className="sm-physical-strip">
                    <span>
                      <strong>무게:</strong> {laptop.weightKg}kg (
                      {laptop.usbCPd ? 'USB-C PD 지원' : '전용 어댑터'})
                    </span>
                    <span>
                      <strong>공간:</strong> {laptop.screenInch}인치 · {laptop.spaceFit}
                    </span>
                    <span>
                      <strong>소음:</strong> {laptop.noiseLevel}
                    </span>
                  </div>

                  {evalResult.warnings.length > 0 && (
                    <ul className="sm-alert-list warning sm-mt-6">
                      {evalResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="sm-laptop-side">
                  <div className="sm-laptop-price">{formatKRW(laptop.price)}</div>
                  <div className="sm-tag-row">
                    {evalResult.badges.map((b, i) => (
                      <span key={i} className="sm-mini-tag">
                        {b}
                      </span>
                    ))}
                    {laptop.tags.map((t, i) => (
                      <span key={i} className="sm-mini-tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="sm-btn sm-btn-primary"
                    onClick={() => addLaptopToCompare(laptop, evalResult)}
                  >
                    비교함에 담기
                  </button>
                  <button
                    type="button"
                    className="sm-btn"
                    onClick={() => openConsultModal('laptop', laptop.name)}
                  >
                    이 모델로 1:1 문의
                  </button>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      {/* ==================== TAB 3: 비교함 ==================== */}
      {activeTab === 'compare' && (
        <main className="sm-panel">
          <div className="sm-panel-head">
            <h2>견적 · 랩탑 통합 비교함 ({compareItems.length}/3)</h2>
            <div className="sm-btn-group">
              <button
                type="button"
                className="sm-btn sm-btn-primary"
                disabled={compareItems.length === 0}
                onClick={copyCompareTable}
              >
                비교 요약 텍스트 복사
              </button>
              <button
                type="button"
                className="sm-btn"
                disabled={compareItems.length === 0}
                onClick={() => setCompareItems([])}
              >
                비교함 비우기
              </button>
            </div>
          </div>

          {compareItems.length === 0 ? (
            <div className="sm-empty-box">
              아직 비교함에 담긴 항목이 없습니다. 데스크톱 견적 계산기나 노트북 탭에서
              후보를 최대 3개까지 담아 나란히 비교해 보세요.
            </div>
          ) : (
            <table className="sm-table sm-compare-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>비교 항목</th>
                  {compareItems.map((item) => (
                    <th key={item.uid}>
                      <div className="sm-compare-col-head">
                        <span>{item.name}</span>
                        <button
                          type="button"
                          className="sm-btn-del"
                          onClick={() => removeCompareItem(item.uid)}
                        >
                          삭제
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sm-cell-label">유형</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>{item.type}</td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">예상 가격</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>
                      <strong>{formatKRW(item.price)}</strong>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">전공·목적 적합도</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>
                      <strong>{item.score}점</strong> / 100
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">CPU</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>{item.cpu}</td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">GPU</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>{item.gpu}</td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">RAM / SSD</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>{item.ramSsd}</td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">전력 · 물리 지표</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>{item.physical}</td>
                  ))}
                </tr>
                <tr>
                  <td className="sm-cell-label">주의 경고 수</td>
                  {compareItems.map((item) => (
                    <td key={item.uid}>
                      {item.warningCount === 0
                        ? '경고 없음'
                        : `주의 ${item.warningCount}건`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </main>
      )}

      {/* 하단 푸터 */}
      <footer className="sm-footer">
        <div>SpecMatch · 동서대학교 학부생용 PC/랩탑 견적 비교 도구</div>
        <button
          type="button"
          className="sm-link-btn"
          onClick={() => openConsultModal(activeTab === 'laptop' ? 'laptop' : 'desktop')}
        >
          {CONSULTATION_CONFIG.buttonLabel} 
        </button>
      </footer>

      {/* ==================== 1:1 견적 문의 모달 ==================== */}
      {consultOpen && (
        <div className="sm-modal-backdrop" onClick={() => setConsultOpen(false)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-panel-head">
              <h2>{CONSULTATION_CONFIG.buttonLabel}</h2>
              <button
                type="button"
                className="sm-btn"
                onClick={() => setConsultOpen(false)}
              >
                닫기
              </button>
            </div>

            <p className="sm-modal-desc">{CONSULTATION_CONFIG.subNotice}</p>

            <label className="sm-modal-label" htmlFor="consult-textarea">
              자동 생성된 문의 템플릿 (복사 후 문의 링크에 붙여넣으세요)
            </label>
            <textarea
              id="consult-textarea"
              className="sm-textarea"
              rows={9}
              value={consultText}
              onChange={(e) => setConsultText(e.target.value)}
            />

            <div className="sm-modal-actions">
              <span className="sm-inline-note">※ 답변에 다소 시간이 걸릴 수 있음</span>
              <button
                type="button"
                className="sm-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(consultText);
                  showToast('문의 템플릿이 복사되었습니다.');
                }}
              >
                문의 내용 복사
              </button>
              <a
                href={CONSULTATION_CONFIG.contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm-btn sm-btn-primary sm-anchor-btn"
              >
                문의 페이지로 이동 ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;