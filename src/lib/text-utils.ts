const EMOJI_REGEX = /[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]|\uFE0F|\u200D/g;
const EXTRA_SPACE_REGEX = /\s{2,}/g;

export function stripEmoji(input: string): string {
  if (!input) return '';
  return input.replace(EMOJI_REGEX, '').replace(EXTRA_SPACE_REGEX, ' ').trim();
}
