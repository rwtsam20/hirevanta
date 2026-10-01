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



app.post("/api/recruiter/jobs", (req, res) => {
  const {
    companyId,
    companyName,
    title,
    location,
    country,
    salary,
    experience,
    description
  } = req.body || {};

  if (!companyId || !title || !location || !description) {
    return res.status(400).json({
      ok: false,
      message: "Company, job title, location and job description are required"
    });
  }

  const db = readDB();

  const company = db.companies.find(
    c => String(c.id) === String(companyId)
  );

  if (!company) {
    return res.status(404).json({
      ok: false,
      message: "Company not found"
    });
  }

  const job = {
    id: Date.now(),
    companyId: company.id,
    companyName: companyName || company.companyName,
    title,
    location,
    country: country || "India",
    salary: salary || "",
    experience: experience || "",
    description,
    status: "active",
    createdAt: new Date().toISOString()
  };

  db.jobs.push(job);
  writeDB(db);

  res.status(201).json({
    ok: true,
    message: "Job posted successfully",
    job
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
  const db = readDB();
  res.json(db.jobs || []);
});

app.get("/api/jobs/:id", (req, res) => {
  const db = readDB();
  const job = (db.jobs || []).find(j => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ok:false,message:"Job not found"});
  res.json({ok:true,job});
});

app.post("/api/jobs/:id/apply", (req, res) => {
  const { name, email, phone, resume } = req.body || {};
  if (!name || !email) return res.status(400).json({ok:false,message:"Name and email are required"});

  const db = readDB();
  const job = (db.jobs || []).find(j => String(j.id) === String(req.params.id));
  if (!job) return res.status(404).json({ok:false,message:"Job not found"});

  if (!db.applications) db.applications = [];

  const application = {
    id: Date.now(),
    jobId: job.id,
    companyId: job.companyId,
    jobTitle: job.title,
    companyName: job.companyName,
    name,
    email,
    phone: phone || "",
    resume: resume || "",
    status: "Applied",
    createdAt: new Date().toISOString()
  };

  db.applications.push(application);
  writeDB(db);

  res.status(201).json({ok:true,message:"Application submitted successfully",application});
});


app.get("/api/candidate/applications/:email",(req,res)=>{
  const db=readDB();
  const email=decodeURIComponent(req.params.email).toLowerCase();
  const applications=(db.applications||[]).filter(
    a=>(a.email||"").toLowerCase()===email
  );
  res.json({ok:true,applications});
});

app.get("/api/recruiter/applications/:companyId", (req, res) => {
  const db = readDB();
  const applications = (db.applications || []).filter(
    a => String(a.companyId) === String(req.params.companyId)
  );
  res.json({ok:true,applications});
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


app.patch("/api/recruiter/application-status", (req,res)=>{
  const {applicationId,status,companyId}=req.body||{};
  const allowed=["Applied","Shortlisted","Rejected","Interview"];
  if(!applicationId||!status||!allowed.includes(status))
    return res.status(400).json({ok:false,message:"Invalid application update"});

  const db=readDB();
  const appx=(db.applications||[]).find(a=>String(a.id)===String(applicationId));
  if(!appx) return res.status(404).json({ok:false,message:"Application not found"});
  if(companyId && String(appx.companyId)!==String(companyId))
    return res.status(403).json({ok:false,message:"Not authorized"});

  appx.status=status;
  appx.updatedAt=new Date().toISOString();
  writeDB(db);
  res.json({ok:true,message:"Application status updated",application:appx});
});

app.get("/api/recruiter/jobs/:companyId", (req,res)=>{
  const db=readDB();
  const jobs=(db.jobs||[]).filter(j=>String(j.companyId)===String(req.params.companyId));
  res.json({ok:true,jobs});
});

app.post("/api/recruiter/ads", (req,res)=>{
  const {companyId,title,description,budget}=req.body||{};
  if(!companyId||!title) return res.status(400).json({ok:false,message:"Company and ad title are required"});
  const db=readDB();
  if(!db.ads) db.ads=[];
  const company=db.companies.find(c=>String(c.id)===String(companyId));
  if(!company) return res.status(404).json({ok:false,message:"Company not found"});

  const ad={
    id:"AD"+Date.now(),
    companyId:company.id,
    companyName:company.companyName,
    title,
    description:description||"",
    budget:budget||0,
    status:"pending",
    createdAt:new Date().toISOString()
  };
  db.ads.push(ad);
  writeDB(db);
  res.status(201).json({ok:true,message:"Company ad created",ad});
});

app.get("/api/recruiter/ads/:companyId",(req,res)=>{
  const db=readDB();
  res.json({ok:true,ads:(db.ads||[]).filter(a=>String(a.companyId)===String(req.params.companyId))});
});



app.post("/api/candidate/register",(req,res)=>{
  const {name,email,phone,password}=req.body||{};
  if(!name||!email||!password)
    return res.status(400).json({ok:false,message:"Name, email and password are required"});

  const db=readDB();
  if(!db.candidates) db.candidates=[];

  if(db.candidates.some(c=>c.email.toLowerCase()===email.toLowerCase()))
    return res.status(409).json({ok:false,message:"Email already registered"});

  const candidate={
    id:"CAN"+Date.now(),
    name,
    email,
    phone:phone||"",
    password:bcrypt.hashSync(password,10),
    location:"",
    skills:"",
    experience:"",
    education:"",
    summary:"",
    resume:"",
    createdAt:new Date().toISOString()
  };

  db.candidates.push(candidate);
  writeDB(db);

  res.status(201).json({
    ok:true,
    message:"Candidate registered successfully",
    candidate:{
      id:candidate.id,
      name:candidate.name,
      email:candidate.email,
      phone:candidate.phone
    }
  });
});

app.post("/api/candidate/login",(req,res)=>{
  const {email,password}=req.body||{};
  if(!email||!password)
    return res.status(400).json({ok:false,message:"Email and password are required"});

  const db=readDB();
  const candidate=(db.candidates||[]).find(
    c=>c.email.toLowerCase()===email.toLowerCase()
  );

  if(!candidate||!candidate.password||!bcrypt.compareSync(password,candidate.password))
    return res.status(401).json({ok:false,message:"Invalid email or password"});

  res.json({
    ok:true,
    message:"Login successful",
    candidate:{
      id:candidate.id,
      name:candidate.name,
      email:candidate.email,
      phone:candidate.phone||"",
      location:candidate.location||"",
      skills:candidate.skills||"",
      experience:candidate.experience||"",
      education:candidate.education||"",
      summary:candidate.summary||"",
      resume:candidate.resume||""
    }
  });
});

app.post("/api/candidates",(req,res)=>{
  const {name,email,phone,location,skills,experience,education,summary,resume}=req.body||{};
  if(!name||!email) return res.status(400).json({ok:false,message:"Name and email are required"});

  const db=readDB();
  if(!db.candidates) db.candidates=[];

  let candidate=db.candidates.find(c=>c.email.toLowerCase()===email.toLowerCase());

  if(candidate){
    Object.assign(candidate,{name,phone:phone||"",location:location||"",skills:skills||"",experience:experience||"",education:education||"",summary:summary||"",resume:resume||"",updatedAt:new Date().toISOString()});
  }else{
    candidate={
      id:"CAN"+Date.now(),name,email,phone:phone||"",location:location||"",
      skills:skills||"",experience:experience||"",education:education||"",
      summary:summary||"",resume:resume||"",createdAt:new Date().toISOString()
    };
    db.candidates.push(candidate);
  }

  writeDB(db);
  res.json({ok:true,message:"Candidate profile saved successfully",candidate});
});

app.get("/api/candidates/:email",(req,res)=>{
  const db=readDB();
  const candidate=(db.candidates||[]).find(c=>c.email.toLowerCase()===req.params.email.toLowerCase());
  if(!candidate) return res.status(404).json({ok:false,message:"Profile not found"});
  res.json({ok:true,candidate});
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
