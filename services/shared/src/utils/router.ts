/**
 * Matches an incoming pathname against a route pattern.
 * Static segments must match exactly.
 * Dynamic segments in the form {param} match any non-empty value.
 *
 * Examples:
 *   matchRoute('/expenses/{id}', '/expenses/abc123')          → true
 *   matchRoute('/a/{id}/b/{id}', '/a/x/b/y')                 → true
 *   matchRoute('/expenses/{id}', '/expenses/')                → false (empty segment)
 *   matchRoute('/expenses', '/expenses/extra')                → false (different length)
 */
export function matchRoute(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/');
  const pathSegments = pathname.split('/');

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((seg, i) => {
    const isDynamic = seg.startsWith('{') && seg.endsWith('}');
    if (isDynamic) {
      return (pathSegments[i]?.length ?? 0) > 0;
    }
    return seg === pathSegments[i];
  });
}
