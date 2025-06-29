import mongoose from 'mongoose';

const shipSchema = new mongoose.Schema({
  name: String,
  engineType: String, 
  capacity: Number,
  type: String 
});

export default mongoose.model('Ship', shipSchema);