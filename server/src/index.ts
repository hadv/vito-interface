import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import walletRoutes from './routes/walletRoutes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Wallet routes
app.use('/api/wallet', walletRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 