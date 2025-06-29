import mongoose from 'mongoose';

const voyageSchema = new mongoose.Schema({
  shipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ship' },
  origin: String,          // Mapped to port coordinates // Check src/utils/portCoordinates.ts
  destination: String,     // Mapped to port coordinates // Check src/utils/portCoordinates.ts
  departureTime: Date,
  cargoWeight: Number,
  weather: String,
  plan: Object,
  fuelEstimate: Number,
  feedbackAt: Date,
  actuals: {
    Speed_Over_Ground_knots: Number,
    Engine_Power_kW: Number,
    Distance_Traveled_nm: Number,
    Operational_Cost_USD: Number,
    Revenue_per_Voyage_USD: Number,
    Efficiency_nm_per_kWh: Number
  }
});

export default mongoose.model('Voyage', voyageSchema);
