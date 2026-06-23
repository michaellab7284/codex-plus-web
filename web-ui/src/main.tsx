import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Global error handler to catch and display runtime errors
window.addEventListener("error", (event) => {
    document.body.innerHTML = `
    <div style="padding:40px;font-family:sans-serif;background:#1a1a24;color:#e8e8ed;min-height:100vh">
      <h1 style="color:#ef4444">⚠ 运行时错误</h1>
      <pre style="background:#2a2a38;padding:16px;border-radius:8px;overflow:auto;margin-top:16px;font-size:14px;line-height:1.5">${event.message}\n${event.filename ? `\n文件: ${event.filename}:${event.lineno}` : ""}</pre>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">重新加载</button>
    </div>
  `;
});

// Catch unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
    document.body.innerHTML = `
    <div style="padding:40px;font-family:sans-serif;background:#1a1a24;color:#e8e8ed;min-height:100vh">
      <h1 style="color:#ef4444">⚠ 异步错误</h1>
      <pre style="background:#2a2a38;padding:16px;border-radius:8px;overflow:auto;margin-top:16px;font-size:14px;line-height:1.5">${event.reason?.message || event.reason || "未知错误"}</pre>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">重新加载</button>
    </div>
  `;
});

const app = document.getElementById("app");
if (app instanceof HTMLElement) {
    try {
        createRoot(app).render(<App />);
    } catch (e: any) {
        app.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#e8e8ed">
        <h1 style="color:#ef4444">⚠ React 渲染错误</h1>
        <pre style="background:#2a2a38;padding:16px;border-radius:8px;margin-top:16px">${e?.message || e}</pre>
      </div>
    `;
    }
}
