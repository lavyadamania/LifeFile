package com.lifefile.scos.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Root Controller — Serves a visual status & quick-link dashboard at http://localhost:8080/
 */
@RestController
public class RootController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String index() {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LifeFile SCOS — Spring Boot App</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
                <style>
                    :root {
                        --bg-base: #090d16;
                        --bg-surface: #101726;
                        --bg-surface-elevated: #162033;
                        --border: #1e293b;
                        --border-focus: #3b82f6;
                        --text-primary: #f8fafc;
                        --text-secondary: #94a3b8;
                        --accent-blue: #3b82f6;
                        --accent-cyan: #06b6d4;
                        --accent-green: #10b981;
                        --accent-purple: #8b5cf6;
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        background: radial-gradient(circle at 50% 0%, #152238 0%, var(--bg-base) 75%);
                        color: var(--text-primary);
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                    }
                    .container {
                        max-width: 860px;
                        width: 100%;
                    }
                    .badge-status {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(16, 185, 129, 0.12);
                        color: var(--accent-green);
                        border: 1px solid rgba(16, 185, 129, 0.25);
                        padding: 6px 14px;
                        border-radius: 9999px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        margin-bottom: 1.5rem;
                    }
                    .badge-status::before {
                        content: '';
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: var(--accent-green);
                        box-shadow: 0 0 10px var(--accent-green);
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.15); }
                    }
                    h1 {
                        font-size: 2.5rem;
                        font-weight: 800;
                        letter-spacing: -0.025em;
                        background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 0.5rem;
                    }
                    .subtitle {
                        color: var(--text-secondary);
                        font-size: 1.1rem;
                        margin-bottom: 2rem;
                    }
                    .card {
                        background: var(--bg-surface);
                        border: 1px solid var(--border);
                        border-radius: 16px;
                        padding: 2rem;
                        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
                        margin-bottom: 2rem;
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 1rem;
                        margin-bottom: 2rem;
                    }
                    .metric-box {
                        background: var(--bg-surface-elevated);
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        padding: 1.25rem;
                    }
                    .metric-label {
                        color: var(--text-secondary);
                        font-size: 0.75rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.35rem;
                    }
                    .metric-val {
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 1.15rem;
                        font-weight: 700;
                        color: #ffffff;
                    }
                    .btn-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 1rem;
                    }
                    .btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 0.85rem 1.5rem;
                        font-size: 0.95rem;
                        font-weight: 600;
                        border-radius: 10px;
                        text-decoration: none;
                        transition: all 0.2s ease;
                        cursor: pointer;
                    }
                    .btn-primary {
                        background: linear-gradient(135deg, #2563eb, #3b82f6);
                        color: #ffffff;
                        box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);
                    }
                    .btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
                    }
                    .btn-secondary {
                        background: var(--bg-surface-elevated);
                        color: var(--text-primary);
                        border: 1px solid var(--border);
                    }
                    .btn-secondary:hover {
                        background: #1e2b45;
                        border-color: #334155;
                    }
                    .endpoints-title {
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: var(--text-secondary);
                        margin-top: 1.5rem;
                        margin-bottom: 0.75rem;
                        font-weight: 700;
                    }
                    .endpoint-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                        gap: 0.5rem;
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 0.85rem;
                    }
                    .endpoint-tag {
                        background: var(--bg-surface-elevated);
                        border: 1px solid var(--border);
                        padding: 0.5rem 0.75rem;
                        border-radius: 6px;
                        color: #cbd5e1;
                    }
                    .tag-method {
                        color: var(--accent-cyan);
                        font-weight: 700;
                        margin-right: 6px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="badge-status">Spring Boot Application Active</div>
                    <h1>LifeFile SCOS Backend</h1>
                    <p class="subtitle">Smart Clinic Operating System &mdash; Enterprise Spring Boot Service</p>

                    <div class="card">
                        <div class="metrics-grid">
                            <div class="metric-box">
                                <div class="metric-label">Server Port</div>
                                <div class="metric-val">8080</div>
                            </div>
                            <div class="metric-box">
                                <div class="metric-label">MongoDB Target</div>
                                <div class="metric-val">scos (Port 27017)</div>
                            </div>
                            <div class="metric-box">
                                <div class="metric-label">Security</div>
                                <div class="metric-val">Stateless JWT</div>
                            </div>
                            <div class="metric-box">
                                <div class="metric-label">WebSocket</div>
                                <div class="metric-val">STOMP (/ws)</div>
                            </div>
                        </div>

                        <div class="btn-group">
                            <a href="http://localhost:5173" class="btn btn-primary" target="_blank">
                                🚀 Launch Frontend Web App (Port 5173) &rarr;
                            </a>
                            <a href="/api/health" class="btn btn-secondary" target="_blank">
                                🩺 View Health JSON (/api/health)
                            </a>
                        </div>

                        <div class="endpoints-title">Active API Controllers</div>
                        <div class="endpoint-list">
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/auth/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/doctors/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/patients/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/appointments/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/queue/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/prescriptions/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/memory/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/hospitals/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/clinics/*</div>
                            <div class="endpoint-tag"><span class="tag-method">API</span> /api/reviews/*</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """;
    }
}
