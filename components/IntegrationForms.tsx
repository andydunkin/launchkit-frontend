

import React, { useEffect, useMemo, useState } from "react";

// ------------------------
// Types
// ------------------------

type FieldType = "text" | "password" | "number" | "boolean" | "email" | "url";

interface SchemaProperty {
  title?: string;
  type?: string;
  secret?: boolean; // if true, render as password & mask when displaying
}

interface IntegrationSchema {
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

interface IntegrationDef {
  id?: string; // optional in case registry doesn't return an id
  slug: string; // e.g., "stripe"
  name: string; // e.g., "Stripe"
  schema?: IntegrationSchema; // JSON schema-style description of fields
  // Optional pre-flattened fields array (if you decide to store it)
  fields?: Array<{ name: string; label: string; type?: FieldType; required?: boolean }>;
}

interface FormState {
  [fieldName: string]: string;
}

interface FormErrors {
  [fieldName: string]: string;
}

interface Alert {
  type: "success" | "error";
  message: string;
}

interface Props {
  projectId: string; // required to post to /projects/{projectId}/integrations/{slug}
  apiBase?: string; // default: process.env.NEXT_PUBLIC_API_URL or ""
}

// ------------------------
// Helpers
// ------------------------

function schemaToFields(def: IntegrationDef): Array<{ name: string; label: string; type: FieldType; required: boolean }> {
  if (def.fields && def.fields.length > 0) {
    return def.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: (f.type as FieldType) || "text",
      required: Boolean(f.required),
    }));
  }
  const props = def.schema?.properties ?? {};
  const required = new Set(def.schema?.required ?? []);
  return Object.entries(props).map(([key, meta]) => ({
    name: key,
    label: meta.title ?? key,
    type: (meta.secret ? "password" : (meta.type as FieldType)) || "text",
    required: required.has(key),
  }));
}

// ------------------------
// Component
// ------------------------

const IntegrationForms: React.FC<Props> = ({ projectId, apiBase }) => {
  const baseUrl = useMemo(() => apiBase || process.env.NEXT_PUBLIC_API_URL || "", [apiBase]);

  const [registry, setRegistry] = useState<IntegrationDef[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // key by slug
  const [env, setEnv] = useState<"dev" | "prod">("prod");
  const [formStates, setFormStates] = useState<Record<string, FormState>>({}); // key by slug
  const [formErrors, setFormErrors] = useState<Record<string, FormErrors>>({}); // key by slug
  const [alert, setAlert] = useState<Alert | null>(null);

  // Load available integrations from registry
  useEffect(() => {
    const fetchRegistry = async () => {
      setLoading(true);
      try {
        const url = `${baseUrl}/integrations`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch integrations registry (HTTP ${resp.status}).`);
        const data: IntegrationDef[] = await resp.json();
        setRegistry(data);
        // initialize form states per slug from schema
        const initial: Record<string, FormState> = {};
        data.forEach((def) => {
          const fields = schemaToFields(def);
          const state: FormState = {};
          fields.forEach((f) => {
            state[f.name] = "";
          });
          // prefer slug as stable key; fall back to id
          const key = def.slug || def.id || Math.random().toString(36).slice(2);
          initial[key] = state;
        });
        setFormStates(initial);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load integrations.";
        setAlert({ type: "error", message });
      } finally {
        setLoading(false);
      }
    };
    fetchRegistry();
  }, [baseUrl]);

  const handleExpand = (slug: string) => {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const handleInputChange = (slug: string, fieldName: string, value: string) => {
    setFormStates((prev) => ({
      ...prev,
      [slug]: {
        ...(prev[slug] || {}),
        [fieldName]: value,
      },
    }));
  };

  const validate = (def: IntegrationDef, formState: FormState): FormErrors => {
    const errors: FormErrors = {};
    const fields = schemaToFields(def);
    fields.forEach((field) => {
      if (field.required && !formState[field.name]) {
        errors[field.name] = "This field is required.";
      }
    });
    return errors;
  };

  const handleSubmit = async (def: IntegrationDef, e: React.FormEvent) => {
    e.preventDefault();
    const slug = def.slug || def.id || "";
    if (!slug) {
      setAlert({ type: "error", message: "Invalid integration (missing slug)." });
      return;
    }
    const state = formStates[slug] || {};
    const errors = validate(def, state);
    setFormErrors((prev) => ({ ...prev, [slug]: errors }));
    if (Object.keys(errors).length > 0) {
      setAlert({ type: "error", message: "Please fill all required fields." });
      return;
    }

    try {
      const payload = { env, values: state };
      const url = `${baseUrl}/projects/${projectId}/integrations/${encodeURIComponent(def.slug)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to save secrets (${resp.status}). ${errText}`);
      }
      setAlert({ type: "success", message: `Saved ${def.name} secrets for ${env.toUpperCase()}.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed.";
      setAlert({ type: "error", message });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Integration Secrets</h2>
        <div>
          <label htmlFor="env-select" style={{ marginRight: 8 }}>Environment:</label>
          <select id="env-select" value={env} onChange={(e) => setEnv(e.target.value as "dev" | "prod")}> 
            <option value="prod">Production</option>
            <option value="dev">Development</option>
          </select>
        </div>
      </div>

      {alert && (
        <div
          style={{
            margin: "1em 0",
            padding: "1em",
            background: alert.type === "success" ? "#e6ffe6" : "#ffe6e6",
            border: `1px solid ${alert.type === "success" ? "#4caf50" : "#f44336"}`,
            color: alert.type === "success" ? "#2e7d32" : "#b71c1c",
          }}
          role="alert"
        >
          {alert.message}
        </div>
      )}

      {loading ? (
        <div>Loading integrations...</div>
      ) : registry.length === 0 ? (
        <div>No integrations available. Ask an admin to seed the registry.</div>
      ) : (
        <div>
          {registry.map((def) => {
            const slug = def.slug || def.id || Math.random().toString(36).slice(2);
            const fields = schemaToFields(def);
            return (
              <div
                key={slug}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  marginBottom: "1em",
                  boxShadow: "0 2px 6px #0001",
                }}
              >
                <button
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "#f7f7f7",
                    border: "none",
                    padding: "1em",
                    fontWeight: "bold",
                    fontSize: "1.05em",
                    cursor: "pointer",
                    borderRadius: "6px 6px 0 0",
                  }}
                  onClick={() => handleExpand(slug)}
                  aria-expanded={!!expanded[slug]}
                  aria-controls={`integration-form-${slug}`}
                >
                  {def.name}
                  <span style={{ float: "right" }}>{expanded[slug] ? "▲" : "▼"}</span>
                </button>

                {expanded[slug] && (
                  <form
                    id={`integration-form-${slug}`}
                    style={{ padding: "1em" }}
                    onSubmit={(e) => handleSubmit(def, e)}
                    noValidate
                  >
                    {fields.map((field) => (
                      <div key={field.name} style={{ marginBottom: "1em" }}>
                        <label style={{ display: "block", fontWeight: 500 }} htmlFor={`${slug}-${field.name}`}>
                          {field.label}
                          {field.required && <span style={{ color: "#d32f2f" }}>*</span>}
                        </label>
                        <input
                          id={`${slug}-${field.name}`}
                          type={field.type === "password" ? "password" : "text"}
                          name={field.name}
                          value={formStates[slug]?.[field.name] || ""}
                          onChange={(e) => handleInputChange(slug, field.name, e.target.value)}
                          required={field.required}
                          style={{
                            width: "100%",
                            padding: "0.5em",
                            border: "1px solid #ccc",
                            borderRadius: 4,
                          }}
                          autoComplete="off"
                        />
                        {formErrors[slug]?.[field.name] && (
                          <div style={{ color: "#d32f2f", fontSize: "0.95em" }}>
                            {formErrors[slug][field.name]}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      style={{
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "0.7em 1.5em",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Save Secrets
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IntegrationForms;