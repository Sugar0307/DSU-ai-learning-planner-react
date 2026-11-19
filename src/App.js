import React, { useState, useEffect } from 'react';
import './App.css';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const SLOTS = ['오전', '오후', '저녁'];

const DEFAULT_SCHEDULE = {
  '오전-월': '자료구조\n연결리스트·큐 복습',
  '오전-화': '선형대수학\n행렬 연산 정리',
  '오전-수': 'C언어\n포인터 개념 복습',
  '오전-목': '파이썬\n자료형·함수 정리',
  '오전-금': 'JS / React\nHooks 실습 복습',
  '오전-토': '주간 전공 복습',
  '오전-일': '부족한 단원 보충',
  '오후-월': '전공 강의 수강',
  '오후-화': '전공 강의 수강',
  '오후-수': '전공 강의 수강',
  '오후-목': '전공 강의 수강',
  '오후-금': '전공 강의 수강',
  '오후-토': '개인 프로젝트 개발',
  '오후-일': '과제 마감 점검',
  '저녁-월': 'React 실습 과제',
  '저녁-화': '자료구조 구현 연습',
  '저녁-수': '알고리즘 문제 풀이',
  '저녁-목': 'RDBMS SQL 실습',
  '저녁-금': '전공 서적 요약',
  '저녁-토': '휴식 및 재충전',
  '저녁-일': '다음 주 계획 수립',
};

const DEFAULT_TODOS = [
  { id: 1, title: '자료구조 연결리스트 과제 제출', dueDate: '2026-11-25', done: false },
  { id: 2, title: 'React 웹 플래너 배포 확인', dueDate: '2026-11-20', done: false },
];

function loadStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function getDDayInfo(dueDateStr) {
  if (!dueDateStr) return { label: '상시', className: 'dday-badge' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDateStr + 'T00:00:00');
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return { label: 'D-Day', className: 'dday-badge urgent' };
  if (diff > 0) {
    return {
      label: `D-${diff}`,
      className: diff <= 3 ? 'dday-badge urgent' : 'dday-badge',
    };
  }
  return { label: `D+${Math.abs(diff)}`, className: 'dday-badge past' };
}

function App() {
  // 1. 주간 시간표 상태
  const [schedule, setSchedule] = useState(() =>
    loadStorage('dsu_react_schedule', DEFAULT_SCHEDULE)
  );

  // 2. 과제/D-Day 상태
  const [todos, setTodos] = useState(() =>
    loadStorage('dsu_react_todos', DEFAULT_TODOS)
  );
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDate, setTodoDate] = useState('');

  // 3. 집중 타이머 상태
  const [timerModeMin, setTimerModeMin] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // 4. AI 학습 프롬프트 빌더 상태
  const [subject, setSubject] = useState('자료구조');
  const [topic, setTopic] = useState('이진 탐색 트리(BST)의 삽입과 삭제 시간복잡도');
  const [promptMode, setPromptMode] = useState('summary');
  const [copied, setCopied] = useState(false);

  // localStorage 자동 저장
  useEffect(() => {
    localStorage.setItem('dsu_react_schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('dsu_react_todos', JSON.stringify(todos));
  }, [todos]);

  // 타이머 동작
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          alert('집중 학습 시간이 종료되었습니다!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleScheduleChange = (slot, day, value) => {
    setSchedule((prev) => ({
      ...prev,
      [`${slot}-${day}`]: value,
    }));
  };

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;
    setTodos((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: todoTitle.trim(),
        dueDate: todoDate,
        done: false,
      },
    ]);
    setTodoTitle('');
    setTodoDate('');
  };

  const handleToggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleDeleteTodo = (id) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSetTimerPreset = (minutes) => {
    setIsRunning(false);
    setTimerModeMin(minutes);
    setSecondsLeft(minutes * 60);
  };

  const formatTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const buildPrompt = () => {
    const subj = subject.trim() || '[과목명]';
    const top = topic.trim() || '[학습 주제]';

    if (promptMode === 'summary') {
      return `너는 대학교 컴퓨터공학 전공 튜터야.\n[${subj}] 과목의 '${top}' 주제를 학부생 눈높이에 맞춰 핵심 개념, 동작 원리, 시험에 자주 나오는 포인트 3가지로 구조화해서 간결하게 요약해줘.`;
    }
    if (promptMode === 'quiz') {
      return `너는 대학교 [${subj}] 과목 출제 교수야.\n'${top}' 주제에 대해 객관식 3문제와 단답형/서술형 2문제를 출제해줘. 정답과 해설은 내가 답을 제출한 뒤에 알려줘.`;
    }
    return `너는 시니어 소프트웨어 엔지니어야.\n[${subj}] 과목의 '${top}' 관련 코드를 작성하고 있는데, 아래 코드에서 논리적 오류나 시간복잡도 개선 포인트를 찾아 단계별로 설명해줘.\n\n[여기에 코드 붙여넣기]`;
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('클립보드 복사에 실패했습니다. 텍스트를 직접 복사해 주세요.');
    }
  };

  const handleResetAll = () => {
    if (!window.confirm('시간표와 과제 목록을 초기 상태로 되돌릴까요?')) return;
    setSchedule(DEFAULT_SCHEDULE);
    setTodos(DEFAULT_TODOS);
  };

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DSU AI learning planner</h1>
        <div className="header-meta">
          <span>{todayLabel}</span>
          <span>브라우저 자동 저장 중</span>
          <button type="button" className="btn-reset-all" onClick={handleResetAll}>
            초기화
          </button>
        </div>
      </header>

      <main className="main-grid">
        {/* 좌측 영역: 주간 시간표 + AI 프롬프트 빌더 */}
        <div className="left-col">
          <section className="panel">
            <div className="panel-header">
              <h2>주간 학습 시간표</h2>
              <span className="panel-sub">칸을 클릭해 바로 수정 (자동 저장)</span>
            </div>
            <div className="panel-body schedule-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="slot-col">구분</th>
                    {DAYS.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="slot-label">{slot}</td>
                      {DAYS.map((day) => {
                        const key = `${slot}-${day}`;
                        return (
                          <td key={key}>
                            <textarea
                              className="schedule-cell"
                              value={schedule[key] || ''}
                              onChange={(e) =>
                                handleScheduleChange(slot, day, e.target.value)
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>AI 학습 프롬프트 빌더</h2>
              <span className="panel-sub">ChatGPT / Gemini 질문용 원클릭 복사</span>
            </div>
            <div className="panel-body">
              <div className="prompt-form">
                <input
                  type="text"
                  className="input-field"
                  placeholder="과목명 (예: 자료구조)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="학습 주제 또는 질문 키워드"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="mode-group">
                <button
                  type="button"
                  className={`mode-btn ${promptMode === 'summary' ? 'active' : ''}`}
                  onClick={() => setPromptMode('summary')}
                >
                  개념 핵심 요약
                </button>
                <button
                  type="button"
                  className={`mode-btn ${promptMode === 'quiz' ? 'active' : ''}`}
                  onClick={() => setPromptMode('quiz')}
                >
                  예상 퀴즈 생성
                </button>
                <button
                  type="button"
                  className={`mode-btn ${promptMode === 'debug' ? 'active' : ''}`}
                  onClick={() => setPromptMode('debug')}
                >
                  코드 디버깅
                </button>
              </div>

              <textarea className="prompt-preview" readOnly value={buildPrompt()} />

              <button type="button" className="btn-primary" onClick={handleCopyPrompt}>
                {copied ? '클립보드에 복사되었습니다' : '프롬프트 복사하기'}
              </button>
            </div>
          </section>
        </div>

        {/* 우측 영역: 집중 타이머 + 과제 D-Day */}
        <div className="right-col">
          <section className="panel">
            <div className="panel-header">
              <h2>집중 타이머</h2>
              <span className="panel-sub">{timerModeMin}분 세션</span>
            </div>
            <div className="panel-body">
              <div className="timer-display">{formatTime(secondsLeft)}</div>
              <div className="timer-controls">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsRunning((prev) => !prev)}
                >
                  {isRunning ? '일시정지' : '시작'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSetTimerPreset(timerModeMin)}
                >
                  리셋
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSetTimerPreset(25)}
                >
                  25분
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSetTimerPreset(50)}
                >
                  50분
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>과제 · 시험 D-Day</h2>
              <span className="panel-sub">
                완료 {todos.filter((t) => t.done).length} / {todos.length}
              </span>
            </div>
            <div className="panel-body">
              <form className="todo-form" onSubmit={handleAddTodo}>
                <input
                  type="text"
                  className="input-field input-title"
                  placeholder="과제 또는 시험 일정 입력"
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                />
                <input
                  type="date"
                  className="input-field input-date"
                  value={todoDate}
                  onChange={(e) => setTodoDate(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  추가
                </button>
              </form>

              {todos.length === 0 ? (
                <div className="empty-msg">등록된 일정이 없습니다.</div>
              ) : (
                <ul className="todo-list">
                  {todos.map((item) => {
                    const dday = getDDayInfo(item.dueDate);
                    return (
                      <li key={item.id} className="todo-item">
                        <label className="todo-left">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggleTodo(item.id)}
                          />
                          <span className={`todo-text ${item.done ? 'done' : ''}`}>
                            {item.title}
                          </span>
                        </label>
                        <div className="todo-right">
                          <span className={dday.className}>{dday.label}</span>
                          <button
                            type="button"
                            className="btn-del"
                            onClick={() => handleDeleteTodo(item.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;