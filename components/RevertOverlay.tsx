import React from 'react';

interface RevertOverlayProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function RevertOverlay({
  isVisible,
  onConfirm,
  onCancel,
  title = "Confirm Revert",
  message = "Are you sure you want to revert these changes?"
}: RevertOverlayProps) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111'
        }}>
          {title}
        </h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#666',
          lineHeight: 1.4
        }}>
          {message}
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Revert
          </button>
        </div>
      </div>
    </div>
  );
}