export const number = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    notation: value >= 1000000 ? 'compact' : 'standard',
  }).format(value);
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
export const bytes = (value: number) =>
  value >= 1073741824
    ? `${(value / 1073741824).toFixed(1)} GB`
    : value >= 1048576
      ? `${(value / 1048576).toFixed(1)} MB`
      : `${(value / 1024).toFixed(1)} KB`;
