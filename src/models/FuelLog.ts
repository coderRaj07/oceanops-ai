import mongoose from 'mongoose';

const fuelLogSchema = new mongoose.Schema({
  voyageId: mongoose.Schema.Types.ObjectId,
  timestamp: Date,
  fuelConsumed: Number,
});

export default mongoose.model('FuelLog', fuelLogSchema);