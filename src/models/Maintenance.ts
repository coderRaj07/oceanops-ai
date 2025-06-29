import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  shipId: mongoose.Schema.Types.ObjectId,
  recordedIssues: [String],
  lastService: Date,
  nextForecastedService: Date,
  maintenanceStatus: String // <-- add this (Fair, Critical, Good)
});


export default mongoose.model('Maintenance', maintenanceSchema);