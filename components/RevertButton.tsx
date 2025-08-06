// components/RevertButton.tsx

import { useState } from "react";
import axios from "axios";

interface RevertButtonProps {
  projectId: string;
}

const RevertButton: React.FC<RevertButtonProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRevert = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(`/deployments/${projectId}/revert`);
      setMessage(response.data.message || "Revert successful.");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.error || "Failed to revert.");
      } else {
        setMessage("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-md">
      <button
        onClick={handleRevert}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Reverting..." : "Revert Last Change"}
      </button>
      {message && (
        <p className="mt-2 text-sm text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
};

export default RevertButton;
