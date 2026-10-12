export interface ListeningItem {
  id: string;
  englishText: string;
  vietnameseMeaning: string;
  // Cho chế độ 2: Bắt từ khóa & Tóm tắt
  question?: string;
  keyPoints?: string[];
  // Cho chế độ 5: Gap Fill
  blankTargetWord?: string;
  maskedSentence?: string;
  soundExplanation?: string;
}

export type ListeningModeType =
  | 'echo' // 1. Audio Echo (Repeat After Me)
  | 'keyword' // 2. Catch the Keyword & Gist
  | 'speed' // 4. Speed Ramp Challenge (0.8x -> 1.4x)
  | 'gapfill'; // 5. Selective Gap Fill (Linking / Weak forms)

export interface ListeningLevelInfo {
  id: string;
  label: string;
  title: string;
  desc: string;
  wordCount: string;
  focus: string;
}

export const LISTENING_LEVELS: ListeningLevelInfo[] = [
  {
    id: 'A1_A2',
    label: 'A1–A2',
    title: 'Cơ bản (Beginner)',
    desc: 'Câu ngắn, từ vựng hằng ngày, phát âm rõ ràng, nối âm phụ âm - nguyên âm.',
    wordCount: '6–10 từ',
    focus: 'Nối âm cơ bản (turn off, pick up, an apple), mạo từ lướt nhẹ.',
  },
  {
    id: 'B1',
    label: 'B1',
    title: 'Trung cấp (Intermediate)',
    desc: 'Tốc độ tự nhiên, cụm động từ thông dụng, dạng yếu của từ chức năng (weak forms).',
    wordCount: '10–16 từ',
    focus: 'Weak forms (can, to, for, at, from), nối âm /t/, /d/ (get to, need it).',
  },
  {
    id: 'B2',
    label: 'B2',
    title: 'Khá (Upper-Intermediate)',
    desc: 'Tốc độ người bản xứ, nuốt âm (elision), biến âm (assimilation), thành ngữ.',
    wordCount: '14–22 từ',
    focus: 'Nuốt âm /t/, /d/, biến âm (could you -> /kʊdʒuː/), liên kết âm /r/, /j/, /w/.',
  },
  {
    id: 'C1',
    label: 'C1',
    title: 'Nâng cao (Advanced)',
    desc: 'Nói siêu tốc, ngữ điệu phức tạp, bóc tách âm trong thảo luận chuyên sâu.',
    wordCount: '18–28 từ',
    focus: 'Nuốt nhiều âm tiết liên tiếp (multisyllabic reduction), nhịp điệu trọng âm, sắc thái tranh luận.',
  },
];
