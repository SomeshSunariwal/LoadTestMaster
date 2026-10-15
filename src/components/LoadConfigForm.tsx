import './css/LoadConfigForm.css';
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
            tooltip="The number of simulated users sending requests at the same time."
          />
          <NumberField
            label="Ramp up (seconds)"
            max={86400}
            value={value.rampUp}
            onChange={(v) => set('rampUp', v)}
            tooltip="How many seconds to take to bring all virtual users online. Set 0 to start them immediately."
          />
          <NumberField
            label="Duration (seconds)"
            min={1}
            max={86400}
            value={value.duration}
            onChange={(v) => set('duration', v)}
            tooltip="The maximum length of the test. It can finish earlier if all finite iteration counts are reached."
          />
          <NumberField
            label="Iterations per user"
            min={-1}
            value={value.iterations}
            onChange={(v) => set('iterations', v)}
            tooltip="How many request batches each user runs for this API. Each batch sends the configured parallel requests. Use -1 to keep repeating until the duration ends."
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
            tooltip="Maximum time to wait for an individual API response before marking it timed out."
          />
          <NumberField
            label="Request delay (ms)"
            max={60000}
            value={value.delay}
            onChange={(v) => set('delay', v)}
            tooltip="A fixed pause after each request batch before the user starts its next batch."
          />
          <NumberField
            label="Parallel requests / API"
            min={1}
            max={20}
            value={value.parallel}
            onChange={(v) => set('parallel', v)}
            tooltip="How many requests for this API each user sends at once in a batch. Higher values increase concurrent traffic."
          />
          <NumberField
            label="Rate limit (RPS, 0 = off)"
            max={100000}
            value={value.rateLimit}
            onChange={(v) => set('rateLimit', v)}
            tooltip="An optional maximum request-start rate. Set 0 to turn this cap off and let users and parallel requests drive traffic."
          />
        </div>
        <Toggle
          checked={value.thinkTime}
          onChange={(v) => set('thinkTime', v)}
          label="Random think time"
          tooltip="When enabled, adds a random pause after each request batch to imitate users thinking between actions."
        />
        {value.thinkTime && (
          <div className="form-grid">
            <NumberField
              label="Minimum (ms)"
              max={60000}
              value={value.thinkMin}
              onChange={(v) => set('thinkMin', v)}
              tooltip="The shortest random think-time pause added after a request batch."
            />
            <NumberField
              label="Maximum (ms)"
              max={60000}
              value={value.thinkMax}
              onChange={(v) => set('thinkMax', v)}
              tooltip="The longest random think-time pause added after a request batch."
            />
          </div>
        )}
      </div>
    </>
  );
}
