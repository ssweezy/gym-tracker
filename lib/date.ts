export const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const RU_MONTHS_NOM = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
];

export const RU_WEEKDAY_LONG = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

/** Convert JS Date.getDay() (0=Sun..6=Sat) to schema weekday (1=Mon..7=Sun) */
export function toSchemaWeekday(d: Date = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** Monday of the current week, set to 00:00 local time. */
export function getMondayOfWeek(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const wd = toSchemaWeekday(out);
  out.setDate(out.getDate() - (wd - 1));
  return out;
}

export function formatRuDate(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
}

/** ISO week number (1..53) */
export function getISOWeek(d: Date = new Date()): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const jan4 = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayDiff - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
