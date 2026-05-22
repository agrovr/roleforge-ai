export type InterviewPrepClipboardItem = {
  question: string;
  answer_bullets?: string[];
};

export function formatInterviewPrepForClipboard(items: InterviewPrepClipboardItem[]) {
  return items
    .map((item, index) => {
      const question = item.question.trim();
      const bullets = (item.answer_bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);
      if (!question && !bullets.length) return "";

      const heading = question || `Interview question ${index + 1}`;
      const answers = bullets.map((bullet) => `- ${bullet}`).join("\n");
      return answers ? `${index + 1}. ${heading}\n${answers}` : `${index + 1}. ${heading}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
