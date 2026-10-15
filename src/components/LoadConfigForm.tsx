import type { LoadConfig } from '../shared/schema';
import { NumberField, Toggle } from './ui';
export function LoadConfigForm({
  value,
  onChange,
}: {
  value: LoadConfig;
  onChange: (v: LoadConfig) => void;
}) {
  const set = (key: keyof LoadConfig, v: number | boolean) => onChange({ ...value, [key]: v });
  return (
    <>
      <div className="config-section">
        <h4>Load configuration</h4>
        <div className="form-grid">
          <NumberField
            label="Virtual users"
            min={1}
            max={1000}
            value={value.users}
            onChange={(v) => set('users', v)}
          />
          <NumberField
            label="Ramp up (seconds)"
            max={86400}
            value={value.rampUp}
            onChange={(v) => set('rampUp', v)}
          />
          <NumberField
            label="Duration (seconds)"
            min={1}
            max={86400}
            value={value.duration}
            onChange={(v) => set('duration', v)}
          />
          <NumberField
            label="Iterations per user"
            min={1}
            value={value.iterations}
            onChange={(v) => set('iterations', v)}
          />
        </div>
      </div>
      <div className="config-section">
        <h4>Request configuration</h4>
        <div className="form-grid">
          <NumberField
            label="Timeout (seconds)"
            min={1}
            max={300}
            value={value.timeout}
            onChange={(v) => set('timeout', v)}
          />
          <NumberField
            label="Request delay (ms)"
            max={60000}
            value={value.delay}
            onChange={(v) => set('delay', v)}
          />
          <NumberField
            label="Parallel requests / API"
            min={1}
            max={20}
            value={value.parallel}
            onChange={(v) => set('parallel', v)}
          />
          <NumberField
            label="Rate limit (RPS, 0 = off)"
            max={100000}
            value={value.rateLimit}
            onChange={(v) => set('rateLimit', v)}
          />
        </div>
        <Toggle
          checked={value.thinkTime}
          onChange={(v) => set('thinkTime', v)}
          label="Random think time"
        />
        {value.thinkTime && (
          <div className="form-grid">
            <NumberField
              label="Minimum (ms)"
              max={60000}
              value={value.thinkMin}
              onChange={(v) => set('thinkMin', v)}
            />
            <NumberField
              label="Maximum (ms)"
              max={60000}
              value={value.thinkMax}
              onChange={(v) => set('thinkMax', v)}
            />
          </div>
        )}
      </div>
    </>
  );
}
