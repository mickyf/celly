// supabase/functions/sentry-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENTRY_HOST = "1fd537c434b91841719c2cbc79a9b4db@o4510690789359616.ingest.de.sentry.io"; // Ersetze dies durch deinen Sentry Host
const KNOWN_PROJECT_IDS = ["4510690792243280"]; // Liste deiner erlaubten Sentry Projekt-IDs (Sicherheit!)

const ALLOWED_ORIGINS = [
  "https://celly.pages.dev",
  "http://localhost:5173",
];

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "content-type, x-sentry-auth",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    // Das Envelope-Format enthält die Header in der ersten Zeile
    const firstLine = body.split("\n")[0];
    const header = JSON.parse(firstLine);

    // Validierung der Projekt-ID aus dem Envelope-Header oder der DSN
    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace("/", "");

    if (!KNOWN_PROJECT_IDS.includes(projectId)) {
      return new Response("Invalid Project ID", { status: 401, headers: corsHeaders });
    }

    // Konstruiere die Sentry Ingest URL
    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

    // Prepare headers for Sentry API
    const sentryHeaders: Record<string, string> = {
      "Content-Type": "application/x-sentry-envelope",
    };

    // Forward X-Sentry-Auth if present in the original request
    const sentryAuth = req.headers.get("x-sentry-auth");
    if (sentryAuth) {
      sentryHeaders["X-Sentry-Auth"] = sentryAuth;
    }

    // Weiterleitung an Sentry mit allen notwendigen Headern
    const response = await fetch(sentryUrl, {
      method: "POST",
      body: body,
      headers: sentryHeaders,
    });

    return new Response(response.body, {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});