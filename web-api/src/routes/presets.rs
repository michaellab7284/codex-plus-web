use axum::Json;
use axum::http::StatusCode;
use serde_json::{Value, json};

/// GET /api/providers/presets - List all provider presets
pub async fn list_presets() -> Json<Value> {
    Json(json!({
        "presets": [
            {
                "id": "openai",
                "name": "OpenAI Official",
                "category": "official",
                "baseUrl": "https://api.openai.com/v1",
                "protocol": "responses",
                "model": "gpt-5.5",
                "websiteUrl": "https://chatgpt.com/codex"
            },
            {
                "id": "deepseek",
                "name": "DeepSeek",
                "category": "cn_official",
                "baseUrl": "https://api.deepseek.com",
                "protocol": "chatCompletions",
                "model": "deepseek-v4-flash",
                "modelList": ["deepseek-v4-flash", "deepseek-v4-pro"],
                "websiteUrl": "https://platform.deepseek.com",
                "apiKeyUrl": "https://platform.deepseek.com/api_keys"
            },
            {
                "id": "zhipu-glm",
                "name": "Zhipu GLM",
                "category": "cn_official",
                "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
                "protocol": "chatCompletions",
                "model": "glm-5.1",
                "modelList": ["glm-5.1"],
                "websiteUrl": "https://open.bigmodel.cn",
                "apiKeyUrl": "https://www.bigmodel.cn/claude-code?ic=RRVJPB5SII"
            },
            {
                "id": "kimi",
                "name": "Kimi",
                "category": "cn_official",
                "baseUrl": "https://api.moonshot.cn/v1",
                "protocol": "chatCompletions",
                "model": "kimi-k2.6",
                "modelList": ["kimi-k2.6"],
                "websiteUrl": "https://platform.moonshot.cn",
                "apiKeyUrl": "https://platform.moonshot.cn/console/api-keys"
            },
            {
                "id": "bailian",
                "name": "Bailian (Qwen)",
                "category": "cn_official",
                "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
                "protocol": "chatCompletions",
                "model": "qwen3-coder-plus",
                "modelList": ["qwen3-coder-plus", "qwen3-max"],
                "websiteUrl": "https://bailian.console.aliyun.com",
                "apiKeyUrl": "https://bailian.console.aliyun.com/#/api-key"
            },
            {
                "id": "stepfun",
                "name": "StepFun",
                "category": "cn_official",
                "baseUrl": "https://api.stepfun.com/step_plan/v1",
                "protocol": "chatCompletions",
                "model": "step-3.5-flash-2603",
                "modelList": ["step-3.5-flash-2603", "step-3.5-flash"],
                "websiteUrl": "https://platform.stepfun.com/step-plan",
                "apiKeyUrl": "https://platform.stepfun.com/interface-key"
            },
            {
                "id": "siliconflow",
                "name": "SiliconFlow",
                "category": "aggregator",
                "baseUrl": "https://api.siliconflow.cn/v1",
                "protocol": "chatCompletions",
                "model": "Pro/MiniMaxAI/MiniMax-M2.7",
                "modelList": ["Pro/MiniMaxAI/MiniMax-M2.7"],
                "websiteUrl": "https://siliconflow.cn",
                "apiKeyUrl": "https://cloud.siliconflow.cn/i/drGuwc9k"
            },
            {
                "id": "openrouter",
                "name": "OpenRouter",
                "category": "aggregator",
                "baseUrl": "https://openrouter.ai/api/v1",
                "protocol": "chatCompletions",
                "model": "gpt-5.5",
                "websiteUrl": "https://openrouter.ai",
                "apiKeyUrl": "https://openrouter.ai/keys"
            },
            {
                "id": "azure",
                "name": "Azure OpenAI",
                "category": "third_party",
                "baseUrl": "https://YOUR_RESOURCE_NAME.openai.azure.com/openai",
                "protocol": "responses",
                "model": "gpt-5.5",
                "websiteUrl": "https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/codex"
            }
        ]
    }))
}
