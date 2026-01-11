// supabase/functions/sentry-tunnel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENTRY_HOST = "1fd537c434b91841719c2cbc79a9b4db@o4510690789359616.ingest.de.sentry.io"; // Ersetze dies durch deinen Sentry Host
const KNOWN_PROJECT_IDS = ["4510690792243280"]; // Liste deiner erlaubten Sentry Projekt-IDs (Sicherheit!)

serve(async (req) => {
  // CORS-Handling für Browser-Anfragen
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "content-type" 
      } 
    });
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
      return new Response("Invalid Project ID", { status: 401 });
    }

    // Konstruiere die Sentry Ingest URL
    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;

    // Weiterleitung an Sentry
    const response = await fetch(sentryUrl, {
      method: "POST",
      body: body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});