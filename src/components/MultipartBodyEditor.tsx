import { useState } from 'react';
import { FiPlus, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import { parseMultipartFields, type MultipartField } from '../shared/multipart';
import { pair } from '../shared/defaults';
import { VariableInput } from './VariableInput';
import { Button, IconButton } from './ui';
import './css/MultipartBodyEditor.css';

export function MultipartBodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  let fields: MultipartField[] = [];
  let invalid = false;
  try {
    fields = parseMultipartFields(value);
  } catch {
    invalid = true;
  }
  const commit = (next: MultipartField[]) => {
    const body = JSON.stringify(next);
    if (body.length > 1000000) {
      setError('The combined form is too large. Use smaller files (up to 512 KB each).');
      return;
    }
    setError('');
    onChange(body);
  };
  const update = (id: string, patch: Partial<MultipartField>) =>
    commit(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      setError('Choose a file up to 512 KB.');
      return;
    }
    setUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      update(id, { file: { name: file.name, type: file.type, data: btoa(binary) }, value: '' });
    } catch {
      setError('Could not read the selected file.');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="multipart-body-editor">
      {invalid ? (
        <>
          <p className="muted helper">The current body is not a multipart form.</p>
          <Button onClick={() => onChange('[]')}>Create multipart form</Button>
        </>
      ) : (
        <fieldset disabled={uploading} className="multipart-fields">
          <div className="multipart-table">
            <div className="multipart-row multipart-heading">
              <span />
              <span>Key</span>
              <span>Value</span>
              <span>Content-Type</span>
              <span>Description</span>
              <span />
            </div>
            {fields.map((field, index) => (
              <div className="multipart-row" key={field.id}>
                <input
                  type="checkbox"
                  checked={field.enabled}
                  aria-label={`Enable multipart field ${index + 1}`}
                  onChange={(event) => update(field.id, { enabled: event.target.checked })}
                />
                <VariableInput
                  value={field.key}
                  placeholder="Key"
                  aria-label={`Multipart key ${index + 1}`}
                  onValueChange={(key) => update(field.id, { key })}
                />
                <div className="multipart-value">
                  {field.file ? (
                    <>
                      <span className="multipart-filename" title={field.file.name}>
                        {field.file.name}
                      </span>
                      <IconButton
                        label={`Remove file ${index + 1}`}
                        onClick={() => update(field.id, { file: undefined })}
                      >
                        <FiX />
                      </IconButton>
                    </>
                  ) : (
                    <VariableInput
                      value={field.value}
                      placeholder="Value or {{variable}}"
                      aria-label={`Multipart value ${index + 1}`}
                      onValueChange={(value) => update(field.id, { value })}
                    />
                  )}
                  <label className="multipart-upload" title="Upload file">
                    <FiUpload />
                    <input
                      type="file"
                      aria-label={`Upload file for field ${index + 1}`}
                      onChange={(event) => {
                        void upload(field.id, event.target.files?.[0]);
                      }}
                    />
                  </label>
                </div>
                <VariableInput
                  value={field.contentType}
                  placeholder="Auto"
                  aria-label={`Multipart content type ${index + 1}`}
                  onValueChange={(contentType) => update(field.id, { contentType })}
                />
                <VariableInput
                  value={field.description}
                  placeholder="Description"
                  aria-label={`Multipart description ${index + 1}`}
                  onValueChange={(description) => update(field.id, { description })}
                />
                <IconButton
                  label={`Delete multipart field ${index + 1}`}
                  onClick={() => commit(fields.filter((item) => item.id !== field.id))}
                >
                  <FiTrash2 className="delete-icon" />
                </IconButton>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => commit([...fields, { ...pair(), contentType: '', description: '' }])}
          >
            <FiPlus />
            Add item
          </Button>
        </fieldset>
      )}
      <p className="muted helper">
        Upload files up to 512 KB each. Content-Type is detected automatically; override it when
        needed.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
