require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);
app.use(express.json());

// Validate lead data
const validateLeadData = (data) => {
  const errors = [];
  if (!data.name?.trim()) errors.push("Name is required");
  if (!data.email?.trim()) {
    errors.push("Email is required");
  } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push("Invalid email format");
  }
  return errors;
};

// Lead submission endpoint
app.post("/api/leads", async (req, res) => {
  try {
    const leadData = req.body;
    const errors = validateLeadData(leadData);
    if (errors.length) return res.status(400).json({ errors });

    console.log("Received lead:", leadData);

    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const response = await axios.post(
          process.env.N8N_WEBHOOK_URL,
          leadData,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 5000,
          }
        );
        console.log("n8n Response:", {
          status: response.status,
          data: response.data,
          executionId: response.headers["x-execution-id"],
        });
      } catch (error) {
        console.error("n8n Forwarding Error:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.N8N_WEBHOOK_URL || "Not set"}`);
});
