export interface TopicSuggestion {
  label: string;
  icon: string;
  keywords: string;
}

export const TOPIC_SUGGESTIONS: TopicSuggestion[] = [
  { label: 'Ngẫu nhiên', icon: '🎲', keywords: '' },
  { label: 'Công sở & Phỏng vấn', icon: '💼', keywords: 'công việc văn phòng, họp hành, viết email, phỏng vấn xin việc' },
  { label: 'Du lịch & Sân bay', icon: '✈️', keywords: 'du lịch, sân bay, khách sạn, hỏi đường, gọi món nhà hàng' },
  { label: 'Đời sống & Bạn bè', icon: '☕', keywords: 'đời sống hàng ngày, bạn bè, ăn uống, gia đình, sở thích' },
  { label: 'Mua sắm & Trả giá', icon: '💳', keywords: 'mua sắm, giá cả, hoàn trả hàng, mặc cả, ngân hàng' },
  { label: 'Công nghệ & AI', icon: '💻', keywords: 'công nghệ thông tin, phần mềm, mạng xã hội, AI, làm việc online' },
];

export function resolveTopicPrompt(topicText: string): string {
  const trimmed = topicText.trim();
  if (!trimmed || trimmed === 'Ngẫu nhiên') return '';
  const matched = TOPIC_SUGGESTIONS.find((t) => t.label.toLowerCase() === trimmed.toLowerCase());
  return matched?.keywords || trimmed;
}
