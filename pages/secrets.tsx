import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify';

const supabase = createClient('https://your-supabase-url.supabase.co', 'public-anon-key');

type Integration = {
  id: string;
  name: string;
  description: string;
  fields: { name: string; label: string; type: string; required: boolean }[];
};

type Secret = {
  id: string;
  integration_id: string;
  user_id: string;
  values: { [key: string]: string };
};

const SecretsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});
  const [secretId, setSecretId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const user = supabase.auth.user();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  useEffect(() => {
    if (selectedIntegrationId && user) {
      fetchSecretForUser(selectedIntegrationId, user.id);
    } else {
      setFormValues({});
      setSecretId(null);
    }
  }, [selectedIntegrationId, user]);

  const fetchIntegrations = async () => {
    const { data, error } = await supabase
      .from('integration_registry')
      .select('id, name, description, fields');
    if (error) {
      toast.error('Failed to load integrations');
      return;
    }
    // fields is stored as JSON, parse it if needed
    const parsed = data?.map((integration) => ({
      ...integration,
      fields: typeof integration.fields === 'string' ? JSON.parse(integration.fields) : integration.fields,
    })) || [];
    setIntegrations(parsed);
  };

  const fetchSecretForUser = async (integrationId: string, userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('secrets')
      .select('id, values')
      .eq('integration_id', integrationId)
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to load your secret');
      setLoading(false);
      return;
    }
    if (data) {
      setSecretId(data.id);
      setFormValues(data.values || {});
    } else {
      setSecretId(null);
      setFormValues({});
    }
    setLoading(false);
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const validateForm = () => {
    if (!selectedIntegrationId) return false;
    const integration = integrations.find((i) => i.id === selectedIntegrationId);
    if (!integration) return false;
    for (const field of integration.fields) {
      if (field.required && !formValues[field.name]?.trim()) {
        toast.error(`Field "${field.label}" is required.`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save secrets.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);

    const payload = {
      integration_id: selectedIntegrationId,
      user_id: user.id,
      values: formValues,
    };

    let response;
    if (secretId) {
      response = await supabase
        .from('secrets')
        .update(payload)
        .eq('id', secretId);
    } else {
      response = await supabase.from('secrets').insert(payload);
    }

    if (response.error) {
      toast.error('Failed to save secret');
    } else {
      toast.success('Secret saved successfully');
      if (!secretId && response.data?.[0]?.id) {
        setSecretId(response.data[0].id);
      }
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!secretId) return;
    setLoading(true);
    const { error } = await supabase.from('secrets').delete().eq('id', secretId);
    if (error) {
      toast.error('Failed to delete secret');
    } else {
      toast.success('Secret deleted successfully');
      setSecretId(null);
      setFormValues({});
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Manage API Keys / Secrets</h2>
      <div>
        <label htmlFor="integration-select">Select Integration:</label>
        <select
          id="integration-select"
          value={selectedIntegrationId}
          onChange={(e) => setSelectedIntegrationId(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Select an integration --</option>
          {integrations.map((integration) => (
            <option key={integration.id} value={integration.id}>
              {integration.name}
            </option>
          ))}
        </select>
      </div>
      {selectedIntegrationId && (
        <>
          <div style={{ marginTop: '1rem' }}>
            {integrations
              .find((i) => i.id === selectedIntegrationId)
              ?.fields.map((field) => (
                <div key={field.name} style={{ marginBottom: '0.5rem' }}>
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required && ' *'}
                  </label>
                  <input
                    id={field.name}
                    type={field.type === 'password' ? 'password' : 'text'}
                    value={formValues[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    disabled={loading}
                  />
                </div>
              ))}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleSave} disabled={loading}>
              Save
            </button>
            {secretId && (
              <button onClick={handleDelete} disabled={loading} style={{ marginLeft: '1rem' }}>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SecretsManager;
