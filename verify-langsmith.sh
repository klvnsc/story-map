#!/bin/bash

# LangSmith Verification Script
echo "🔍 Verifying LangSmith Configuration..."
echo ""

# Check if telemetry is enabled
if [ "$CLAUDE_CODE_ENABLE_TELEMETRY" = "1" ]; then
    echo "✅ Telemetry enabled: $CLAUDE_CODE_ENABLE_TELEMETRY"
else
    echo "❌ Telemetry not enabled"
    exit 1
fi

# Check OTEL configuration
if [ -n "$OTEL_EXPORTER_OTLP_LOGS_ENDPOINT" ]; then
    echo "✅ OTEL endpoint configured: $OTEL_EXPORTER_OTLP_LOGS_ENDPOINT"
else
    echo "❌ OTEL endpoint not configured"
    exit 1
fi

# Check API key configuration (partial check for security)
if [[ "$OTEL_EXPORTER_OTLP_HEADERS" == *"x-api-key"* ]] && [[ "$OTEL_EXPORTER_OTLP_HEADERS" == *"story-map-development"* ]]; then
    echo "✅ API key and project configured"
else
    echo "❌ API key or project not properly configured"
    exit 1
fi

# Check user prompts logging
if [ "$OTEL_LOG_USER_PROMPTS" = "1" ]; then
    echo "✅ User prompts logging enabled: $OTEL_LOG_USER_PROMPTS"
else
    echo "❌ User prompts logging not enabled"
    exit 1
fi

echo ""
echo "🎉 LangSmith configuration verified successfully!"
echo "📊 Your Claude Code sessions will be tracked in project: story-map-development"
echo "🌐 View telemetry at: https://smith.langchain.com"
echo ""
echo "💡 Note: Restart Claude Code for telemetry to take effect"