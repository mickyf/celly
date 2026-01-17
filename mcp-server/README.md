# Celly MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the Celly wine cellar management application. This server enables AI assistants like Claude Desktop to interact with your wine collection through natural language.

---

## 🚀 Quick Start (5 Minutes)

### 1. Build and Deploy
```bash
# 1. From project root, deploy the proxy Edge Function
npx supabase functions deploy mcp-server-proxy --no-verify-jwt

# 2. Build the MCP Server
cd mcp-server
npm install
npm run build
```

### 2. Get Your Authentication Token
1. Log in to your Celly application in the browser.
2. Open DevTools (F12) → Console and run:
   ```javascript
   // For local dev:
   JSON.parse(localStorage.getItem('sb-127.0.0.1:54321-auth-token')).access_token
   
   // For production (replace your-project-ref):
   JSON.parse(localStorage.getItem('sb-your-project-ref-auth-token')).access_token
   ```
3. Copy the token.

### 3. Configure Claude Desktop
Edit your `claude_desktop_config.json`:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "celly": {
      "command": "node",
      "args": ["/absolute/path/to/celly/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "USER_AUTH_TOKEN": "your-auth-token-from-step-2"
      }
    }
  }
}
```
*Note: Restart Claude Desktop after saving.*

---

## ✨ Features

### Resources
- **Wine Collection** (`celly://wines`) - View collection organized by drinking status.
- **Wine Details** (`celly://wines/{id}`) - View details, drink window, and tasting notes.

### Tools
- **`list_wines`** - List all wines with status.
- **`get_wine`** - Detailed info for a specific wine.
- **`add_wine`** - Add a new wine (name, vintage, grapes, quantity, price, etc.).

---

## 🛡️ Architecture & Security

The server uses a **secure Edge Function proxy** to communicate with Supabase.

### Why this design?
- ✅ **Secure**: Your Supabase `anon` key is never exposed.
- ✅ **Authenticated**: All requests use your personal `USER_AUTH_TOKEN`.
- ✅ **Isolated**: Row Level Security (RLS) ensures only your wines are accessible.

### Data Flow
```text
Claude Desktop → MCP Server (stdio) → Supabase Edge Function → Database (RLS)
```

---

## 🛠️ Development

- **Build**: `npm run build`
- **Watch mode**: `npm run dev`
- **Clean**: `npm run clean`

---

## ❓ Troubleshooting

- **Server not appearing?** Use absolute paths in config and restart Claude completely.
- **Authentication error?** Tokens expire. Generate a fresh one from the browser console.
- **"Failed to fetch"?** Ensure Supabase is running (`npx supabase status`) and the Edge Function is deployed.

---

## 📜 License
MIT
