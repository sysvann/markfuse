[English](./README.md) | [简体中文](./README.zh-CN.md)

# MarkFuse

面向 AI 工作流的高保真文档转 Markdown 工具。

MarkFuse 可将 PDF、Office 文档和扫描文件转换为干净、易读的 Markdown，并比通用转换器更好地保留文档结构。

适用于 RAG、知识库导入与长文档处理流程。
也可直接用于 Markdown 笔记应用，无需依赖 AI 层。

## 为什么选择 MarkFuse

多数文档转 Markdown 工具只能提取文本。

MarkFuse 的重点是保留结构。

这意味着在以下方面会更好：

- 标题
- 段落
- 列表
- 表格
- 代码块
- 任务列表
- 行内格式
- 面向人类与 LLM 的可读性

目标不仅是输出 Markdown，而是输出真正可用于 AI 流水线的 Markdown。

## 项目目标

- 产出更干净、更易读的 Markdown
- 尽可能忠实还原文档结构
- 更好支持 LLM 导入、分块、检索与 Agent 工作流
- 可直接用于 Markdown 笔记应用，支持个人与团队知识管理
- 提供可扩展的插件化架构，以支持更多格式与 OCR 后端

## 计划支持的格式

- PDF
- DOCX
- DOC
- XLSX
- 图片与扫描文档 OCR

## 当前状态

MarkFuse 目前处于早期开发阶段。

首个公开版本将聚焦核心文档格式的高质量 Markdown 转换，OCR 与更多高级格式支持将逐步加入。

## 设计理念

MarkFuse 以 AI 为核心，但不依赖 AI 才能工作。

它致力于先产出确定性、结构化的 Markdown，再衔接下游 LLM 处理流程。

## 安装

即将提供。

## CLI

即将提供。

预期用法：

```bash
markfuse convert file.pdf
markfuse convert report.docx
markfuse convert sheet.xlsx
```

## 网站

项目主页：https://markfuse.slog.im

## 许可证

MIT
