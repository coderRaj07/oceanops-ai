import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import connectDB from './utils/db';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

export default app