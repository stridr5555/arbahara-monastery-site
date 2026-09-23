const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const expected = process.env.MAIL_BRIDGE_SECRET;
  const actual = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (
    !expected ||
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return res.status(401).json({ error: "Unauthorized" });
  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    if (!body) {
      const parts = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 4096) return res.status(413).end();
        parts.push(c);
      }
      body = JSON.parse(Buffer.concat(parts).toString());
    }
    const { email, code, purpose = "email" } = body;
    const purposes = {
      email: "sign-in",
      "verify-email": "email verification",
      "reset-password": "password reset",
    };
    if (!Object.hasOwn(purposes, purpose))
      return res.status(400).json({ error: "Invalid request" });
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
        email,
      ) ||
      typeof code !== "string" ||
      !/^\d{8}$/.test(code)
    )
      return res.status(400).json({ error: "Invalid request" });
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await transport.sendMail({
      from: { name: "Arbahara Monastery", address: process.env.SMTP_USER },
      replyTo: "support@haramonastery.org",
      to: email,
      subject: `Your Arbahara ${purposes[purpose]} code`,
      text: `Peace be with you.\n\nYour Arbahara Monastery ${purposes[purpose]} code is: ${code}\n\nThis code expires in 15 minutes. Enter it only on the monastery website. If you did not request this code, you can ignore this email. Never share your password or this code with anyone.\n\nArbahara Monastery\nhttps://www.haramonastery.org\nsupport@haramonastery.org`,
    });
    return res.status(200).json({ sent: true });
  } catch {
    return res
      .status(503)
      .json({ error: "Email delivery is temporarily unavailable." });
  }
};
