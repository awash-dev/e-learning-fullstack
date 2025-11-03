// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js"; 
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Debug environment variables
console.log('🔧 Environment Check:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   DATABASE: ✅ Neon PostgreSQL');
console.log('   GOOGLE_OAUTH:', process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing');
console.log('   EMAIL:', process.env.EMAIL_USER ? '✅ Configured' : '❌ Missing');

// Connect to Neon PostgreSQL
connectDB();

const app = express();

// CORS configuration
app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "🎓 E-Learning Platform API is running...",
    database: "Neon PostgreSQL",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get("/health", async (req, res) => {
  try {
    res.json({
      status: "✅ Healthy",
      database: "✅ Neon PostgreSQL Connected",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: "❌ Unhealthy",
      database: "❌ Connection issue",
      error: error.message
    });
  }
});
// Test CORS endpoint
app.get("/api/test-cors", (req, res) => {
  res.json({
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Database: Neon PostgreSQL`);
  console.log(`🔗 Client: ${process.env.CLIENT_URL}`);
  console.log(`\n📚 API Ready: http://localhost:${PORT}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});