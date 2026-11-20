# 拾日 · 自选 API 版

可在自己电脑上运行的手账。聊天、寄语和周报都使用你配置的模型。

## 启动

1. 安装 Node.js 22 或更新版本，下载并解压项目。
2. 在项目根目录运行 `npm start`，打开 [本机手账](http://127.0.0.1:8767/)。
3. 编辑首次启动生成的 `worker/.dev.vars`，保存后刷新网页。

```dotenv
API_BASE_URL=https://api.deepseek.com
API_MODEL=deepseek-flash
API_KEY=填自己的密钥
```

支持 OpenAI 兼容的 `/chat/completions` 接口。使用 OpenAI、DeepSeek、通义千问兼容接口或 OpenRouter 时，填写供应商提供的基础地址、模型名和 Key。使用本机 Ollama 时，可填 `http://127.0.0.1:11434/v1` 和已安装的模型名，Key 留空。需要 `max_completion_tokens` 的其他接口可加 `API_TOKEN_FIELD=max_completion_tokens`。

今日安排的加号可以上传照片。数据保存在本机 `data/`，备份时复制整个目录。密钥文件和数据目录由 Git 忽略。聊天与周报用到的摘录会交给你配置的供应商。

[试用浏览器版拾日](https://iris-yixinxu.github.io/shiri-memo/)
