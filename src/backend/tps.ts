// Integral of a linear ramp, followed by a constant request-start rate.
export function tpsVolumeAt(seconds: number, target: number, rampUp: number) {
  if (rampUp <= 0) return seconds * target;
  if (seconds < rampUp) return (target * seconds * seconds) / (2 * rampUp);
  return target * (seconds - rampUp / 2);
}

export function tpsTimeAt(volume: number, target: number, rampUp: number) {
  if (rampUp <= 0) return volume / target;
  const rampVolume = (target * rampUp) / 2;
  return volume < rampVolume
    ? Math.sqrt((2 * rampUp * volume) / target)
    : volume / target + rampUp / 2;
}
