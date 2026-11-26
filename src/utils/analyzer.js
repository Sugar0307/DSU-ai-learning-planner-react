import { MAJOR_PROFILES, GAMING_PRESETS } from '../data/hardwareData';

export function formatKRW(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}원`;
}

// 데스크톱 견적 진단 엔진
export function analyzeDesktopBuild({
  parts, // { cpu, cooler, mb, ram, gpu, ssd, psu, caseItem }
  customPrices,
  majorId,
  gamingId,
}) {
  const major = MAJOR_PROFILES.find((m) => m.id === majorId) || MAJOR_PROFILES[0];
  const gaming = GAMING_PRESETS.find((g) => g.id === gamingId) || GAMING_PRESETS[0];

  const prices = {
    cpu: customPrices.cpu ?? parts.cpu.price,
    cooler: customPrices.cooler ?? parts.cooler.price,
    mb: customPrices.mb ?? parts.mb.price,
    ram: customPrices.ram ?? parts.ram.price,
    gpu: customPrices.gpu ?? parts.gpu.price,
    ssd: customPrices.ssd ?? parts.ssd.price,
    psu: customPrices.psu ?? parts.psu.price,
    caseItem: customPrices.case ?? parts.caseItem.price,
  };

  const totalPrice = Object.values(prices).reduce((sum, v) => sum + Number(v || 0), 0);

  // 예상 피크 소비전력 (CPU + GPU + RAM + SSD + 메인보드/팬 약 45W)
  const estimatedWatt =
    parts.cpu.tdp + parts.gpu.tdp + parts.ram.tdp + parts.ssd.tdp + 45;
  const requiredPsu = parts.gpu.recPsu || 600;

  // 적합도 점수 계산 (전공 가중치 + 게이밍 목표 반영)
  let majorScore = Math.round(
    parts.cpu.score * major.weights.cpu +
      parts.gpu.score * major.weights.gpu +
      parts.ram.score * major.weights.ram
  );
  if (gaming.id !== 'none' && !gaming.isInquiryOnly) {
    const gpuDiff = parts.gpu.tier - gaming.minGpuTier;
    const gamingBonus = gpuDiff >= 0 ? 5 : gpuDiff * 15;
    majorScore = Math.max(20, Math.min(100, majorScore + gamingBonus));
  }

  const warnings = [];
  const tips = [];

  // 1. 내장 그래픽 부재 체크 (7500F + 외장 GPU 없음)
  if (!parts.cpu.hasIgpu && parts.gpu.id === 'gpu-none') {
    warnings.push(
      '화면 출력 불가: 라이젠5 7500F는 내장 그래픽이 없으므로 외장 그래픽카드 선택이 필수입니다.'
    );
  }

  // 2. 파워 용량 체크 (5060~5060Ti: 600W / 5070: 700W / 5070Ti~5080: 850W)
  if (parts.psu.watt < requiredPsu) {
    warnings.push(
      `파워 용량 부족: ${parts.gpu.name} 구성은 정격 ${requiredPsu}W 이상 파워를 권장합니다. (현재 ${parts.psu.watt}W)`
    );
  } else {
    tips.push(
      `파워 구성 적정: 예상 피크 전력 ${estimatedWatt}W 대비 ${parts.psu.watt}W 파워로 안정적입니다.`
    );
  }

  if (parts.gpu.id === 'gpu-5060ti' && parts.psu.watt === 600) {
    tips.push(
      'RTX 5060 Ti는 600W로 실사용 가능하나, 일부 3팬/OC 모델 권장 스펙(650W) 및 정숙성을 원하면 700W 업그레이드도 좋은 선택입니다.'
    );
  }
  
  if (parts.gpu.id === 'gpu-5060') {
    tips.push(
      '가성비 참고: 현재 시세 기준 약 8만 원 추가 시 RTX 5060 Ti(8GB)로 약 15~20% 성능 향상이 가능해 가성비가 더 뛰어납니다.'
    );
  }
  // 3. 쿨러 & 메인보드 전원부 체크
  if (parts.cpu.needDualCooler && parts.cooler.tier < 2) {
    warnings.push(
      `${parts.cpu.name}는 발열 제어 및 부스트 유지를 위해 듀얼타워 공랭 쿨러(4만 원대) 선택을 권장합니다.`
    );
  }

  if ((parts.cpu.id === 'cpu-7800x3d' || parts.cpu.id === 'cpu-9800x3d') && parts.mb.tier === 1) {
    tips.push(
      'X3D 상위 CPU 구성 시 전원부 방열판과 확장성이 강화된 B850M 중·상급 메인보드를 권장합니다.'
    );
  }

  // 4. 전공별 RAM 및 GPU 체크
  if (parts.ram.gb < major.minRamGb) {
    warnings.push(
      `[${major.label}] 전공 작업 시 RAM ${major.minRamGb}GB 이상 구성을 권장합니다. (현재 ${parts.ram.gb}GB)`
    );
  }

  if (major.needCuda && parts.gpu.id === 'gpu-none') {
    warnings.push(
      `[${major.label}] 툴 가속(CUDA/렌더링/AI)을 위해 외장 NVIDIA 그래픽카드 탑재를 권장합니다.`
    );
  }

  // 5. 게이밍 목표 대비 GPU 등급 체크
  if (gaming.id !== 'none' && !gaming.isInquiryOnly && parts.gpu.tier < gaming.minGpuTier) {
    warnings.push(
      `선택한 게이밍 목표(${gaming.label}) 대비 그래픽카드 등급이 낮습니다. 목표 프레임 방어가 어려울 수 있습니다.`
    );
  }

  // 6. 가성비 라데온 대안 팁 (QHD 게이밍 구간)
  if (gaming.id === 'fps-qhd' || gaming.id === 'aaa-qhd') {
    tips.push(
      '비전문가 안정성을 위해 NVIDIA 위주로 구성되었습니다. AMD 환경 세팅에 거부감이 없다면 RX 9070 XT 기반 가성비 견적도 메리트가 크니 1:1 문의를 활용해 보세요.'
    );
  }

  return {
    totalPrice,
    estimatedWatt,
    requiredPsu,
    score: majorScore,
    warnings,
    tips,
  };
}

// 랩탑 필터링 및 물리 지표(무게·공간·소음) 경고 엔진
export function evaluateLaptop(laptop, { majorId, gamingId, maxWeight, quietOnly }) {
  const major = MAJOR_PROFILES.find((m) => m.id === majorId) || MAJOR_PROFILES[0];
  const gaming = GAMING_PRESETS.find((g) => g.id === gamingId) || GAMING_PRESETS[0];

  const baseScore = laptop.scores[major.id] ?? 75;
  const warnings = [];
  const badges = [];

  // 휴대성 배지
  if (laptop.weightKg <= 1.4) badges.push('초경량 휴대');
  else if (laptop.weightKg <= 1.8) badges.push('표준 휴대');
  else badges.push('거치형(무거움)');

  // 전공 OS 호환성 체크
  if (major.preferWindows && laptop.os === 'macOS') {
    warnings.push(
      `[${major.label}] 전공 툴(CAD/BIM/언리얼 등) 호환성 문제로 Windows 노트북을 강력히 권장합니다.`
    );
  }

  // 색역 체크
  if (major.needHighColor && !laptop.highColor) {
    warnings.push('디자인/영상 전공은 sRGB 100% 또는 DCI-P3 광색역 패널이 필요합니다.');
  }

  // 게이밍 호환성 체크
  if (gaming.id !== 'none' && !gaming.isInquiryOnly) {
    if (laptop.os === 'macOS') {
      warnings.push('macOS는 발로란트·배그·메이플 등 주요 국내/스팀 게임 지원이 제한됩니다.');
    } else if (laptop.gpuTier < Math.min(gaming.minGpuTier, 2)) {
      warnings.push(
        `선택한 게이밍 목표(${gaming.group}) 대비 노트북 GPU 성능이 부족합니다. 고사양 게임은 데스크톱 구성을 권장합니다.`
      );
    }
  }

  // 무게/소음 트레이드오프 체크
  if (quietOnly && laptop.noiseScore < 80) {
    warnings.push('도서관·강의실 정숙성 조건 대비 고부하 시 팬 소음이 발생할 수 있는 모델입니다.');
  }
  if (laptop.weightKg > maxWeight) {
    warnings.push(`설정한 무게 상한(${maxWeight}kg)을 초과합니다. (어댑터 포함 시 체감 무게 증가)`);
  }

  return {
    score: baseScore,
    warnings,
    badges,
  };
}

// 1:1 퍼스널 견적 문의용 요약 텍스트 자동 생성기
export function buildInquiryTemplate({ mode, majorId, gamingId, desktopSummary, laptopName }) {
  const major = MAJOR_PROFILES.find((m) => m.id === majorId) || MAJOR_PROFILES[0];
  const gaming = GAMING_PRESETS.find((g) => g.id === gamingId) || GAMING_PRESETS[0];

  const lines = [
    '[SpecMatch 1:1 퍼스널 견적 문의]',
    `- 소속/전공 프로필: ${major.label}`,
    `- 게이밍 목표: ${gaming.label}`,
    `- 관심 유형: ${mode === 'desktop' ? '조립 데스크톱' : '노트북(랩탑)'}`,
  ];

  if (mode === 'desktop' && desktopSummary) {
    lines.push(`- 현재 구성 견적: ${desktopSummary}`);
  }
  if (mode === 'laptop' && laptopName) {
    lines.push(`- 관심 랩탑 모델: ${laptopName}`);
  }

  lines.push('- 희망 예산: (예: 180만 원 이내)');
  lines.push('- 추가 요청사항: (예: 화이트 감성 / 기존 SSD 재활용 / 특정 특가 제품 문의 등)');

  return lines.join('\n');
}