#!/usr/bin/env python3
"""Minimal MCP-over-HTTP client for the PixelLab MCP server.

Usage:
    PIXELLAB_KEY=... python3 pixellab_mcp.py <tool_name> '<json_args>'

Notes:
  - The server is a streamable-HTTP MCP endpoint that returns SSE-framed JSON.
  - For each call we re-initialize (the server is stateless across requests).
"""
import json
import os
import sys
import urllib.request

URL = "https://api.pixellab.ai/mcp"


def _post(key: str, payload: dict) -> dict:
    req = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        method="POST",
    )
    raw = urllib.request.urlopen(req, timeout=60).read().decode()
    # SSE frames: "event: message\ndata: {...}\n\n"
    for line in raw.splitlines():
        if line.startswith("data: "):
            return json.loads(line[6:])
    return json.loads(raw)


def call_tool(key: str, name: str, arguments: dict) -> dict:
    # initialize (server is stateless per HTTP request — but the spec still wants it)
    _post(key, {
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                   "clientInfo": {"name": "py-mcp", "version": "1"}},
    })
    resp = _post(key, {
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
    })
    return resp


def main() -> int:
    key = os.environ.get("PIXELLAB_KEY")
    if not key:
        print("set PIXELLAB_KEY", file=sys.stderr)
        return 1
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 1
    name = sys.argv[1]
    arguments = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    out = call_tool(key, name, arguments)
    # Pretty-print just the textual content if it's a simple tool response.
    res = out.get("result", out)
    content = res.get("content") if isinstance(res, dict) else None
    if isinstance(content, list):
        for c in content:
            if c.get("type") == "text":
                print(c.get("text", ""))
            else:
                print(json.dumps(c, indent=2))
    else:
        print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
