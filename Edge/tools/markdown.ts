/**
 * Dependency-free Markdown-only validation for durable Scrum item bodies.
 * Rejects raw HTML and script URLs before project records are written by the Host.
 * @param body - Candidate item body.
 * @returns A refusal reason, or null when the body is plain Markdown.
 */
export function markdownRefusal(body: string): string | null {
  // Autolinks like <https://…> are Markdown, not raw HTML; blank them first.
  const withoutAutolinks = body.replace(/<(?:https?:\/\/|mailto:)[^\s>]*>/gu, '')
  if (/<!--/u.test(withoutAutolinks)) return 'HTML comments are not Markdown; remove the comment'
  if (/<\/?[a-zA-Z][^>]*>/u.test(withoutAutolinks)) return 'HTML tags are not Markdown; remove the tag'
  if (/\]\(\s*(?:javascript|vbscript):|<(?:javascript|vbscript):/u.test(withoutAutolinks)) {
    return 'script URLs are not Markdown; remove the link'
  }
  return null
}
