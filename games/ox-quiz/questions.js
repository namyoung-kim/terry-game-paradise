// ===== OX 퀴즈 문제 데이터 통합 =====
// 각 카테고리별 데이터 파일(data/*.js)에서 로드된 변수들을 하나로 합칩니다.
// 새 형식: { category, oq(정답문장), xq(오답문장), exp(풀이) }
// 게임 시작 시 랜덤으로 oq(O) 또는 xq(X) 버전을 선택합니다.

const QUESTIONS_RAW = [
    ...QUESTIONS_KOREAN,
    ...QUESTIONS_MATH,
    ...QUESTIONS_SCIENCE,
    ...QUESTIONS_SOCIETY,
    ...QUESTIONS_HISTORY,
    ...QUESTIONS_SAFETY,
    ...QUESTIONS_NONSENSE
];

// 랜덤으로 O/X 버전을 선택하여 실제 게임에 쓸 문제 생성
function buildQuestions(rawList) {
    return rawList.map(item => {
        const showO = Math.random() < 0.5;
        return {
            category: item.category,
            q: showO ? item.oq : item.xq,
            a: showO, // oq면 정답은 O(true), xq면 정답은 X(false)
            exp: item.exp
        };
    });
}

const QUESTIONS = buildQuestions(QUESTIONS_RAW);

// 디버깅을 위한 로그
const oCount = QUESTIONS.filter(q => q.a === true).length;
const xCount = QUESTIONS.filter(q => q.a === false).length;
console.log(`Loaded ${QUESTIONS.length} questions. (O: ${oCount}, X: ${xCount})`);
