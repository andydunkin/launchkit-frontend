import { SimpleChatInterface } from "../../../components/SimpleChatInterface";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function ConceptPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const pid = projectId as string;

  // State management
  const [seedPrompt, setSeedPrompt] = useState<string>("");

  // Load project data and check for query parameters on mount
  useEffect(() => {
    if (!pid) return;
    
    // Check for seed_prompt query parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const seedPromptFromQuery = urlParams.get('seed_prompt');
    
    if (seedPromptFromQuery) {
      console.log('📍 Found seed_prompt in URL:', seedPromptFromQuery);
      setSeedPrompt(decodeURIComponent(seedPromptFromQuery));
      return; // Use query param instead of loading from project
    }
    
    const loadProject = async () => {
      try {
        const project = await api<{
          ok: boolean;
          project: {
            name: string;
            description?: string;
            seed_prompt?: string;
          };
        }>(`/projects/${pid}`);
        
        if (project.ok && project.project.seed_prompt) {
          setSeedPrompt(project.project.seed_prompt);
        }
      } catch (error) {
        console.error("Failed to load project:", error);
      }
    };

    loadProject();
  }, [pid]);

  // Handle message callback for preview refresh
  const handleMessage = useCallback((message: string, response: { app_generated?: boolean; app_updated?: boolean; app_url?: string }) => {
    // Auto-refresh preview when app is generated or updated
    if (response.app_generated) {
      console.log("🎉 App generated! Loading live preview...");
      const appUrl = response.app_url || `https://app-${pid.substring(0, 8)}.launchkit.stratxi.com`;
      console.log("🔗 Loading preview URL:", appUrl);
      // Poll the app URL until it's ready, then load in iframe
      const pollAppReady = async () => {
        console.log("🔍 Polling app readiness...");
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max (30 * 10s)
        
        const checkApp = async (): Promise<boolean> => {
          try {
            const response = await fetch(appUrl, { method: 'HEAD', mode: 'no-cors' });
            return true; // If no error, app is ready
          } catch {
            return false;
          }
        };

        while (attempts < maxAttempts) {
          const isReady = await checkApp();
          if (isReady) {
            console.log(`✅ App ready after ${attempts * 10} seconds!`);
            const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
            if (iframe) {
              iframe.src = appUrl;
            }
            return;
          }
          attempts++;
          console.log(`⏳ App not ready yet (attempt ${attempts}/${maxAttempts}), waiting 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
        
        console.log("⚠️ App didn't respond after 5 minutes, loading anyway...");
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe) {
          iframe.src = appUrl;
        }
      };
      
      pollAppReady();
    } else if (response.app_updated) {
      console.log("✅ App updated! Refreshing preview...");
      setTimeout(() => {
        const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
        if (iframe) iframe.src = iframe.src; // Force refresh
      }, 2000);
    }
  }, [pid]);

  // onSend function removed - using handleMessage callback instead

  // Styles
  const layout = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr", // 2 columns: chat, preview
    height: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    gap: "20px"
  };

  const rightCol = {
    display: "flex",
    flexDirection: "column" as const,
    padding: "24px",
    overflow: "auto",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  };

  const previewCol = {
    background: "rgba(255, 255, 255, 0.95)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  };

  const pill = {
    display: "inline-block",
    fontSize: 12,
    background: "rgba(255, 255, 255, 0.9)",
    color: "#374151",
    padding: "8px 16px",
    borderRadius: 20,
    textDecoration: "none",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    fontWeight: 500,
    transition: "all 0.2s ease"
  };

  if (!pid) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>LaunchKit - App Concept</title>
      </Head>
      
      <div style={layout}>
        {/* Left: Chat Interface */}
        <main style={rightCol}>
          <header style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: 'center' }}>
              <a href={`/dashboard`} style={pill}>Back to Dashboard</a>
              <a href={`/projects/${pid}`} style={pill}>Project Home</a>
            </div>
          </header>

          {/* Use SimpleChatInterface for all interactions - no simulation mode */}
          <SimpleChatInterface
            projectId={pid}
            appConcept={seedPrompt || ""}
            onMessage={handleMessage}
          />
        </main>

        {/* Right: Live Preview */}
        <aside style={previewCol}>
          <div style={{ 
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)", 
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)", 
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px"
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 16, 
              fontWeight: 600, 
              color: "#1e293b",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              🚀 Live Preview
            </h3>
            <button
              onClick={() => {
                const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                if (iframe) iframe.src = iframe.src; // Force refresh
              }}
              style={{
                ...pill,
                cursor: "pointer",
                fontSize: 11,
                padding: "6px 12px",
                background: "rgba(102, 126, 234, 0.1)",
                border: "1px solid rgba(102, 126, 234, 0.2)",
                color: "#667eea"
              }}
            >
              ↻ Refresh
            </button>
          </div>
          
          <iframe
            id="preview-iframe"
            src="data:text/html,<html><body style='font-family:system-ui;text-align:center;padding:60px;background:linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);color:#475569;'><div style='max-width:300px;margin:0 auto;'><div style='font-size:48px;margin-bottom:16px;'>🎨</div><h3 style='color:#334155;margin:0 0 12px 0;'>App Preview</h3><p style='line-height:1.6;margin:0;opacity:0.8;'>Your app will appear here once Claude generates it. Start chatting to bring your idea to life!</p></div></body></html>"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              flex: 1
            }}
            title="App Preview"
          />
        </aside>
      </div>
    </>
  );
}