// components/RevertOverlay.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function RevertOverlay({ message }: { message?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 right-4 bg-white shadow-xl rounded-2xl p-4 border z-50 max-w-xs"
    >
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium text-gray-800">
          {message || 'Reverted to previous version.'}
        </div>
        <button
          onClick={() => setVisible(false)}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="mt-2">
        <a
          href=""
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Refresh to view changes
        </a>
      </div>
    </motion.div>
  );
}
