import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureLeadsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id VARCHAR(64) PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      consent BOOLEAN NOT NULL DEFAULT false,
      debt_type VARCHAR(100),
      approximate_amount VARCHAR(50),
      call_time VARCHAR(50),
      state VARCHAR(10),
      trigger_type VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

interface LeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  debtType?: string;
  approximateAmount?: string;
  callTime?: string;
  state?: string;
  triggerType?: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-\s().]/g, "").trim();
}

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureLeadsTable();

  app.post("/api/leads", async (req: Request, res: Response) => {
    try {
      const body = req.body as LeadPayload;

      if (!body.firstName?.trim() || !body.lastName?.trim()) {
        return res.status(400).json({ error: "First and last name are required" });
      }
      if (!body.email?.trim() || !body.email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required" });
      }
      const cleanPhone = sanitizePhone(body.phone ?? "");
      if (!cleanPhone || cleanPhone.replace(/\D/g, "").length < 10) {
        return res.status(400).json({ error: "A valid 10-digit phone number is required" });
      }
      if (!body.consent) {
        return res.status(400).json({ error: "Consent to be contacted is required" });
      }

      const id = generateId();
      const now = new Date().toISOString();

      await pool.query(
        `INSERT INTO leads
          (id, first_name, last_name, email, phone, consent, debt_type, approximate_amount, call_time, state, trigger_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          body.firstName.trim(),
          body.lastName.trim(),
          body.email.trim().toLowerCase(),
          cleanPhone,
          true,
          body.debtType ?? null,
          body.approximateAmount ?? null,
          body.callTime ?? null,
          body.state ?? null,
          body.triggerType ?? null,
          now,
        ]
      );

      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              firstName: body.firstName.trim(),
              lastName: body.lastName.trim(),
              email: body.email.trim().toLowerCase(),
              phone: cleanPhone,
              debtType: body.debtType,
              approximateAmount: body.approximateAmount,
              callTime: body.callTime,
              state: body.state,
              triggerType: body.triggerType,
              createdAt: now,
            }),
          });
        } catch (webhookErr) {
          console.error("Webhook delivery failed (non-fatal):", webhookErr);
        }
      }

      console.log(
        `[LEAD] ${body.firstName} ${body.lastName} | ${body.email} | ${body.state ?? "—"} | trigger: ${body.triggerType ?? "general"}`
      );

      return res.status(200).json({
        success: true,
        id,
        message: "We'll be in touch within 1 business day.",
      });
    } catch (err) {
      console.error("Lead submission error:", err);
      return res.status(500).json({ error: "Unable to submit at this time. Please try again." });
    }
  });

  app.get("/api/leads", async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        "SELECT * FROM leads ORDER BY created_at DESC LIMIT 100"
      );
      return res.json({
        count: result.rowCount,
        leads: result.rows.map((r) => ({
          id: r.id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone,
          debtType: r.debt_type,
          approximateAmount: r.approximate_amount,
          callTime: r.call_time,
          state: r.state,
          triggerType: r.trigger_type,
          createdAt: r.created_at,
        })),
      });
    } catch (err) {
      console.error("Leads fetch error:", err);
      return res.status(500).json({ error: "Could not retrieve leads" });
    }
  });

  app.get("/api/leads/count", async (_req: Request, res: Response) => {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM leads");
      return res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
      return res.status(500).json({ error: "Could not count leads" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
