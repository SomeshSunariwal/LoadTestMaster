import './css/LoadConfigForm.css';
import { FiActivity, FiUsers } from 'react-icons/fi';
import type { LoadConfig } from '../shared/schema';
import { NumberField, Toggle } from './ui';
export function LoadConfigForm({
  value,
  onChange,
}: {
  value: LoadConfig;
  onChange: (v: LoadConfig) => void;
}) {
  const set = <K extends keyof LoadConfig>(key: K, v: LoadConfig[K]) =>
    onChange({ ...value, [key]: v });
  const tps = value.loadMode === 'tps';
  return (
    <div className="load-config-form">
      <div className="config-section">
        <h4>Load mode</h4>
        <div className="load-mode-switch" role="group" aria-label="Load mode">
          <button type="button" aria-pressed={!tps} onClick={() => set('loadMode', 'users')}>
            <FiUsers /> User-based
          </button>
          <button type="button" aria-pressed={tps} onClick={() => set('loadMode', 'tps')}>
            <FiActivity /> Target TPS
          </button>
        </div>
      </div>
      <div className="config-section">
        <h4>Load configuration</h4>
        {tps && (
          <div className="target-tps-field">
            <NumberField
              label="Target TPS (requests / sec)"
              min={1}
              max={100000}
              value={value.targetTps}
              onChange={(v) => set('targetTps', v)}
              tooltip="Target request starts per second, shared across APIs using this configuration. One transaction is one HTTP request. APIs with their own settings run separately."
            />
          </div>
        )}
        <div className="form-grid">
          {!tps && (
            <NumberField
              label="Virtual users"
              min={1}
              max={1000}
              value={value.users}
              onChange={(v) => set('users', v)}
              tooltip="The number of simulated users sending requests at the same time."
            />
          )}
          <NumberField
            label="Ramp up (seconds)"
            max={86400}
            value={value.rampUp}
            onChange={(v) => set('rampUp', v)}
            tooltip={
              tps
                ? 'Seconds to increase request traffic gradually from zero to the target TPS. Set 0 to start at the target immediately.'
                : 'How many seconds to take to bring all virtual users online. Set 0 to start them immediately.'
            }
          />
          <NumberField
            label="Duration (seconds)"
            min={1}
            max={86400}
            value={value.duration}
            onChange={(v) => set('duration', v)}
            tooltip={
              tps
                ? 'Maximum test duration in seconds, including ramp up.'
                : 'The maximum length of the test. It can finish earlier if all finite iteration counts are reached.'
            }
          />
          {!tps && (
            <NumberField
              label="Iterations per user"
              min={-1}
              value={value.iterations}
              onChange={(v) => set('iterations', v)}
              tooltip="How many request batches each user runs for this API. Each batch sends the configured parallel requests. Use -1 to keep repeating until the duration ends."
            />
          )}
        </div>
      </div>
      <div className="config-section">
        <h4>Request configuration</h4>
        <div className="form-grid">
          <NumberField
            label="Request timeout (ms)"
            min={1}
            max={300000}
            value={value.timeout * 1000}
            onChange={(v) => set('timeout', v / 1000)}
            tooltip="Maximum time to wait for an individual API response, in milliseconds. For example, 1000 ms is 1 second."
          />
          {!tps && (
            <>
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
            </>
          )}
        </div>
        {tps ? (
          <>
            <Toggle
              checked={value.tpsParallel}
              onChange={(v) => set('tpsParallel', v)}
              label="Send parallel requests"
              tooltip="Send one second of target traffic together. At 900 TPS, 900 requests start concurrently about once per second, even if earlier requests are still waiting for responses. Each request has its own timeout."
            />
          </>
        ) : (
          <>
            <Toggle
              checked={value.thinkTime}
              onChange={(v) => set('thinkTime', v)}
              label="Random pause between batches"
              tooltip="Optional: adds a random pause after each request batch to simulate users pausing between actions. This is added to Request delay. Leave it off for steady traffic."
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
          </>
        )}
      </div>
    </div>
  );
}
