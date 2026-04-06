import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SaveChartDialogProps {
  defaultName: string;
  onSave: (name: string, localOnly: boolean) => void;
  onCancel: () => void;
}

export const SaveChartDialog: React.FC<SaveChartDialogProps> = ({ defaultName, onSave, onCancel }) => {
  const { user } = useAuth();
  const [name, setName] = useState(defaultName);
  const [localOnly, setLocalOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed, localOnly);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    background: '#faf7f0',
    border: '1px solid #b8860b',
    borderRadius: '8px',
    padding: '1.5rem',
    maxWidth: '380px',
    width: '90%',
    fontFamily: "'Cormorant', serif",
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.4rem 1rem',
    border: '1px solid #b8860b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'Cormorant', serif",
    fontSize: '0.95rem',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', color: '#2c2c54' }}>Save Chart</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Chart name"
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              fontFamily: "'Cormorant', serif",
              border: '1px solid #b8860b',
              borderRadius: '4px',
              boxSizing: 'border-box',
              marginBottom: '0.75rem',
            }}
          />
          {user && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#666', marginBottom: '1rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={localOnly}
                onChange={e => setLocalOnly(e.target.checked)}
              />
              Keep local only (don't sync to cloud)
            </label>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{ ...buttonStyle, background: 'none', color: '#666' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{ ...buttonStyle, background: '#b8860b', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
