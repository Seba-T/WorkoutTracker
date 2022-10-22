export function areSameDay(first: Date, second: Date): boolean {
  return (
    first.getDate() == second.getDate() &&
    first.getMonth() == second.getMonth() &&
    first.getFullYear() == second.getFullYear()
  );
}
export function comesAfter(
  first: Date | undefined,
  second: Date | undefined
): boolean {
  return first === undefined || second === undefined
    ? false
    : first.getTime() > second.getTime();
}
