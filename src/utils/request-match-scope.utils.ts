/** Owner matches live on the request; renter matches live in grant records. */
export function hasRequestMatch(
  request: { ownerRepresentationMatches?: readonly unknown[] },
  records: readonly { status?: string }[],
): boolean {
  return Boolean(request.ownerRepresentationMatches?.length)
    || records.some(record => ["pending", "approved", "free", "paid"].includes(String(record.status)));
}
