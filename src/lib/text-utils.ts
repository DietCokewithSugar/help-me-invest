const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
const EXTRA_SPACE_REGEX = /\s{2,}/g;

export function stripEmoji(input: string): string {
  if (!input) return '';
  return input.replace(EMOJI_REGEX, '').replace(EXTRA_SPACE_REGEX, ' ').trim();
}
