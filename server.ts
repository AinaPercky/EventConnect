import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { participants } from "./src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { randomUUID } from "crypto";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Real-time clients
  const clients = new Set<express.Response>();

  const broadcastUpdate = async () => {
    try {
      const allParticipants = await db.select().from(participants).orderBy(desc(participants.createdAt));
      const data = JSON.stringify(allParticipants);
      clients.forEach(client => client.write(`data: ${data}\n\n`));
    } catch (e) {
      console.error("Broadcast error", e);
    }
  };

  // Auth sync route
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      const user = await getOrCreateUser(req.user.uid, req.user.email || "");
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get participants (Dashboard)
  app.get("/api/participants", requireAuth, async (req, res) => {
    try {
      const all = await db.select().from(participants).orderBy(desc(participants.createdAt));
      res.json(all);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add participants in batch (CSV import)
  app.post("/api/participants/batch", requireAuth, async (req, res) => {
    try {
      const { participants: newParticipants, replace } = req.body;
      if (!Array.isArray(newParticipants) || newParticipants.length === 0) {
        return res.status(400).json({ error: "No participants provided" });
      }

      if (replace) {
        await db.delete(participants).returning();
      }

      const valuesToInsert = newParticipants.map((p: any) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        emailOrPhone: p.emailOrPhone,
        organization: p.organization || null,
        qrCodeToken: randomUUID(),
      }));

      const result = await db.insert(participants).values(valuesToInsert).returning();
      
      broadcastUpdate();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add participant (Admin Add or Import)
  app.post("/api/participants", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, emailOrPhone, organization } = req.body;
      const qrCodeToken = randomUUID();
      
      const result = await db.insert(participants).values({
        firstName,
        lastName,
        emailOrPhone,
        organization,
        qrCodeToken
      }).returning();
      
      broadcastUpdate();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public self-registration (Surprise guest)
  app.post("/api/public/register", async (req, res) => {
    try {
      const { firstName, lastName, emailOrPhone, organization } = req.body;
      const qrCodeToken = randomUUID();
      
      const result = await db.insert(participants).values({
        firstName,
        lastName,
        emailOrPhone,
        organization,
        qrCodeToken,
        scannedAt: new Date(),
        status: 'present'
      }).returning();
      
      broadcastUpdate();
      res.json(result[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Scan QR code
  app.post("/api/scan", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      const participant = await db.select().from(participants).where(eq(participants.qrCodeToken, token));
      
      if (participant.length === 0) {
        return res.status(404).json({ error: "QR Code Invalide" });
      }
      
      const p = participant[0];
      if (p.status === "present") {
        return res.status(400).json({ error: "Déjà scanné", participant: p });
      }
      
      const updated = await db.update(participants)
        .set({ status: "present", scannedAt: new Date() })
        .where(eq(participants.id, p.id))
        .returning();
        
      broadcastUpdate();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SSE Realtime stream
  app.get("/api/dashboard/stream", requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    clients.add(res);
    
    req.on('close', () => {
      clients.delete(res);
    });
  });

// Setup frontend serving and start server
async function start() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
