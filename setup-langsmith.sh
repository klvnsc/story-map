#!/bin/bash

# LangSmith Setup Script for Claude Code Observability
# This script configures the required environment variables for LangSmith telemetry

echo "🔧 Setting up LangSmith observability for Claude Code..."

# Set LangSmith environment variables
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://api.smith.langchain.com/otel/v1/claude_code
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=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,Langsmith-Project=story-map-development"
export OTEL_LOG_USER_PROMPTS=1

echo "✅ LangSmith environment variables set:"
echo "   - Telemetry enabled: $CLAUDE_CODE_ENABLE_TELEMETRY"
echo "   - Project name: story-map-development"
echo "   - User prompts logging: $OTEL_LOG_USER_PROMPTS"
echo ""
echo "🚀 LangSmith setup complete! Your Claude Code sessions will now be tracked."
echo "📊 View your telemetry at: https://smith.langchain.com"
echo ""
echo "To make this permanent, add these exports to your ~/.zshrc:"
echo "----------------------------------------"
echo "export CLAUDE_CODE_ENABLE_TELEMETRY=1"
echo "export OTEL_LOGS_EXPORTER=otlp"
echo "export OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=http/json"
echo "export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://api.smith.langchain.com/otel/v1/claude_code"
echo "export OTEL_EXPORTER_OTLP_HEADERS=\"x-api-key=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,Langsmith-Project=story-map-development\""
echo "export OTEL_LOG_USER_PROMPTS=1"
echo "----------------------------------------"