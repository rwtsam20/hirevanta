const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, "data", "db.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      companies: [],
      jobs: [],
      applications: [],
      ads: [],
      payments: []
    };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}


app.post("/api/recruiter/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password are required" });
  }

  const db = readDB();
  const company = db.companies.find(
    c => c.email.toLowerCase() === email.toLowerCase()
  );

  if (!company || !bcrypt.compareSync(password, company.password)) {
    return res.status(401).json({ ok: false, message: "Invalid email or password" });
  }

  res.json({
    ok: true,
    message: "Login successful",
    company: {
      id: company.id,
      companyName: company.companyName,
      email: company.email,
      phone: company.phone
    }
  });
});


app.post("/api/recruiter/create-order", (req, res) => {
  const { companyId, plan } = req.body || {};

  const plans = {
    starter: { name: "Starter", amount: 599, days: 7 },
    growth: { name: "Growth", amount: 999, days: 15 }
  };

  if (!companyId || !plans[plan]) {
    return res.status(400).json({
      ok: false,
      message: "Valid company and plan are required"
    });
  }

  const db = readDB();
  const company = db.companies.find(c => String(c.id) === String(companyId));

  if (!company) {
    return res.status(404).json({
      ok: false,
      message: "Company not found"
    });
  }

  const selected = plans[plan];

  const order = {
    id: "CH" + Date.now(),
    companyId: company.id,
    plan: plan,
    planName: selected.name,
    amount: selected.amount,
    days: selected.days,
    status: "created",
    createdAt: new Date().toISOString()
  };

  db.payments.push(order);
  writeDB(db);

  res.json({
    ok: true,
    message: "Payment order created",
    order: order
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "CareerHub",
    message: "CareerHub server is running"
  });
});

app.get("/api/jobs", (req, res) => {
  res.json([
    {
      id: 1,
      title: "Store Manager",
      company: "ABC Retail",
      location: "Sri Ganganagar",
      salary: "₹25,000 - ₹35,000",
      type: "Full Time",
      experience: "2-5 Years"
    },
    {
      id: 2,
      title: "HR Executive",
      company: "Natureland Organics",
      location: "Sri Ganganagar",
      salary: "₹20,000 - ₹30,000",
      type: "Full Time",
      experience: "1-3 Years"
    },
    {
      id: 3,
      title: "Sales Executive",
      company: "CareerHub Partner",
      location: "Jaipur",
      salary: "₹18,000 - ₹28,000",
      type: "Full Time",
      experience: "0-2 Years"
    }
  ]);
});

app.post("/api/recruiter/register", (req, res) => {
  const { companyName, email, phone, password } = req.body || {};

  if (!companyName || !email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Company name, email and password are required"
    });
  }

  const db = readDB();

  if (
    db.companies.some(
      c => c.email.toLowerCase() === email.toLowerCase()
    )
  ) {
    return res.status(409).json({
      ok: false,
      message: "Email already registered"
    });
  }

  const company = {
    id: Date.now(),
    companyName,
    email,
    phone: phone || "",
    password,
    createdAt: new Date().toISOString()
  };

  db.companies.push(company);
  writeDB(db);

  res.status(201).json({
    ok: true,
    message: "Company registered successfully",
    company: {
      id: company.id,
      companyName: company.companyName,
      email: company.email
    }
  });
});

app.get("/recruiter", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "recruiter", "index.html")
  );
});

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`CareerHub running on http://127.0.0.1:${PORT}`);
});
