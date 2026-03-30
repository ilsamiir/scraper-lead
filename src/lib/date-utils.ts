export const toDateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const startOfDayIso = (date: string) =>
  new Date(`${date}T00:00:00`).toISOString();

export const endOfDayIso = (date: string) =>
  new Date(`${date}T23:59:59.999`).toISOString();

export const subtractMonths = (base: Date, months: number) => {
  const next = new Date(base);
  next.setMonth(next.getMonth() - months);
  return next;
};

export const daysBetweenInclusive = (from: string, to: string) => {
  const result: string[] = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    result.push(toDateInput(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
};

export const formatDateIT = (dateStr: string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("it-IT", opts ?? { day: "2-digit", month: "2-digit" });

export const hoursSince = (dateStr: string, now: Date = new Date()) =>
  (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
