import { encode } from 'gpt-tokenizer'

/**
 * Count tokens in text using cl100k_base encoding.
 * Falls back to word estimation if encoding fails.
 */
export function countTokens(text: string): number {
  try {
    return encode(text).length
  } catch {
    return estimateTokens(text)
  }
}

function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.ceil(words * 1.3)
}
