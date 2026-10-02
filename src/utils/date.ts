export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function isFutureEvent(value: string) {
  return new Date(value).getTime() >= Date.now();
}
