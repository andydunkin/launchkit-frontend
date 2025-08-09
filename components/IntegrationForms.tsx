

import React, { useEffect, useState } from "react";

type IntegrationField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
};

type Integration = {
  id: string;
  name: string;
  fields: IntegrationField[];
};

type RegistryResponse = Integration[];

type FormState = {
  [fieldName: string]: string;
};

type FormErrors = {
  [fieldName: string]: string;
};

type Alert = {
  type: "success" | "error";
  message: string;
};

// Dummy user ID for demonstration; replace as needed
const USER_ID = "current_user_id";

const IntegrationForms: React.FC = () => {
  const [registry, setRegistry] = useState<Integration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});
  const [formStates, setFormStates] = useState<{ [integrationId: string]: FormState }>({});
  const [formErrors, setFormErrors] = useState<{ [integrationId: string]: FormErrors }>({});
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    const fetchRegistry = async () => {
      setLoading(true);
      try {
        const resp = await fetch("/integrations/registry");
        if (!resp.ok) throw new Error("Failed to fetch integrations registry.");
        const data: RegistryResponse = await resp.json();
        setRegistry(data);
        // Initialize form states
        const initialStates: { [integrationId: string]: FormState } = {};
        data.forEach((integration) => {
          const state: FormState = {};
          integration.fields.forEach((field) => {
            state[field.name] = "";
          });
          initialStates[integration.id] = state;
        });
        setFormStates(initialStates);
      } catch (err: any) {
        setAlert({ type: "error", message: err.message || "Failed to load." });
      } finally {
        setLoading(false);
      }
    };
    fetchRegistry();
  }, []);

  const handleExpand = (integrationId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [integrationId]: !prev[integrationId],
    }));
  };

  const handleInputChange = (
    integrationId: string,
    fieldName: string,
    value: string
  ) => {
    setFormStates((prev) => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [fieldName]: value,
      },
    }));
  };

  const validate = (integration: Integration, formState: FormState): FormErrors => {
    const errors: FormErrors = {};
    integration.fields.forEach((field) => {
      if (field.required && !formState[field.name]) {
        errors[field.name] = "This field is required.";
      }
    });
    return errors;
  };

  const handleSubmit = async (integration: Integration, e: React.FormEvent) => {
    e.preventDefault();
    const state = formStates[integration.id];
    const errors = validate(integration, state);
    setFormErrors((prev) => ({
      ...prev,
      [integration.id]: errors,
    }));
    if (Object.keys(errors).length > 0) {
      setAlert({
        type: "error",
        message: "Please fill all required fields.",
      });
      return;
    }
    try {
      const payload = {
        user_id: USER_ID,
        integration_id: integration.id,
        secrets: state,
      };
      const resp = await fetch("/secrets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save secrets.");
      }
      setAlert({
        type: "success",
        message: `Secrets for ${integration.name} saved successfully.`,
      });
      // Optionally collapse after submit or clear form
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Submission failed.",
      });
    }
  };

  return (
    <div>
      <h2>Integration Secrets</h2>
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
      ) : (
        <div>
          {registry.map((integration) => (
            <div
              key={integration.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "6px",
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
                  fontSize: "1.1em",
                  cursor: "pointer",
                  borderRadius: "6px 6px 0 0",
                }}
                onClick={() => handleExpand(integration.id)}
                aria-expanded={!!expanded[integration.id]}
                aria-controls={`integration-form-${integration.id}`}
              >
                {integration.name}
                <span style={{ float: "right" }}>
                  {expanded[integration.id] ? "▲" : "▼"}
                </span>
              </button>
              {expanded[integration.id] && (
                <form
                  id={`integration-form-${integration.id}`}
                  style={{ padding: "1em" }}
                  onSubmit={(e) => handleSubmit(integration, e)}
                  noValidate
                >
                  {integration.fields.map((field) => (
                    <div key={field.name} style={{ marginBottom: "1em" }}>
                      <label style={{ display: "block", fontWeight: 500 }}>
                        {field.label}
                        {field.required && (
                          <span style={{ color: "#d32f2f" }}>*</span>
                        )}
                      </label>
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        name={field.name}
                        value={formStates[integration.id]?.[field.name] || ""}
                        onChange={(e) =>
                          handleInputChange(
                            integration.id,
                            field.name,
                            e.target.value
                          )
                        }
                        required={field.required}
                        style={{
                          width: "100%",
                          padding: "0.5em",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                        autoComplete="off"
                      />
                      {formErrors[integration.id]?.[field.name] && (
                        <div style={{ color: "#d32f2f", fontSize: "0.95em" }}>
                          {formErrors[integration.id][field.name]}
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
                      borderRadius: "4px",
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
          ))}
        </div>
      )}
    </div>
  );
};

export default IntegrationForms;