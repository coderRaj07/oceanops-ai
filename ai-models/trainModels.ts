import fs from 'fs';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import * as tf from '@tensorflow/tfjs-node';
import Maintenance from '../src/models/Maintenance';
import Voyage from '../src/models/Voyage';
import connectDB from '../src/utils/db';
import { CATEGORIES, CSV_PATH, oneHotEncode } from './utils';
import { PORT_COORDINATES } from '../src/utils/portCoorodinates';

function toRadians(degrees: number) {
  return degrees * Math.PI / 180;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440; // Earth radius in nautical miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const deriveRouteType = (origin: string, destination: string): string => {
  const origCoord = PORT_COORDINATES[origin];
  const destCoord = PORT_COORDINATES[destination];

  if (!origCoord || !destCoord) return 'Short-haul'; // fallback

  const dist = haversineDistance(origCoord.lat, origCoord.lon, destCoord.lat, destCoord.lon);

  if (dist < 50) return 'Coastal';
  if (dist < 300) return 'Short-haul';
  if (dist < 1500) return 'Long-haul';
  return 'Transoceanic';
};


const loadCSVData = (): Promise<{ inputs: number[]; fuelUsed: number; eta: number }[]> => {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const input = [
          parseFloat(row.Speed_Over_Ground_knots),
          parseFloat(row.Engine_Power_kW),
          parseFloat(row.Distance_Traveled_nm),
          parseFloat(row.Operational_Cost_USD),
          parseFloat(row.Revenue_per_Voyage_USD),
          parseFloat(row.Efficiency_nm_per_kWh),
          ...oneHotEncode(row.Ship_Type, CATEGORIES.Ship_Type),
          ...oneHotEncode(row.Route_Type, CATEGORIES.Route_Type),
          ...oneHotEncode(row.Engine_Type, CATEGORIES.Engine_Type),
          ...oneHotEncode(row.Maintenance_Status, CATEGORIES.Maintenance_Status),
          ...oneHotEncode(row.Weather_Condition, CATEGORIES.Weather_Condition)
        ];
        rows.push({
          inputs: input,
          fuelUsed: parseFloat(row.Operational_Cost_USD),
          eta: parseFloat(row.Distance_Traveled_nm) / parseFloat(row.Speed_Over_Ground_knots)
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
};

export const loadCombinedTrainingData = async (): Promise<{ inputs: number[]; fuelUsed: number; eta: number }[]> => {
  await connectDB();
  const feedbacks = await Voyage.find({ actuals: { $exists: true } }).populate('shipId');
  const mongoData: { inputs: number[]; fuelUsed: number; eta: number }[] = [];

  for (const v of feedbacks) {
    const ship = v as any;
    const maintenance = await Maintenance.findOne({ shipId: ship._id });

    const input = [
      //@ts-ignore
      v.actuals.Speed_Over_Ground_knots,//@ts-ignore
      v.actuals.Engine_Power_kW, //@ts-ignore
      v.actuals.Distance_Traveled_nm, //@ts-ignore
      v.actuals.Operational_Cost_USD, //@ts-ignore
      v.actuals.Revenue_per_Voyage_USD,//@ts-ignore
      v.actuals.Efficiency_nm_per_kWh,//@ts-ignore
      ...oneHotEncode(ship.type || 'Tanker', CATEGORIES.Ship_Type),//@ts-ignore
      ...oneHotEncode(deriveRouteType(v.origin, v.destination), CATEGORIES.Route_Type),  // To get the route type from feedbacks (mongoDB)
      ...oneHotEncode(ship.engineType || 'Diesel', CATEGORIES.Engine_Type),
      ...oneHotEncode(maintenance?.maintenanceStatus || 'Good', CATEGORIES.Maintenance_Status),
      ...oneHotEncode(v.weather || 'Calm', CATEGORIES.Weather_Condition)
    ];

    mongoData.push({
      //@ts-ignore
      inputs: input,//@ts-ignore
      fuelUsed: v.actuals.Operational_Cost_USD,//@ts-ignore
      eta: v.actuals.Distance_Traveled_nm / v.actuals.Speed_Over_Ground_knots
    });
  }

  const csvData = await loadCSVData();
  return [...csvData, ...mongoData];
};


const FUEL_MODEL_PATH = 'file://./ai-models/models/fuel_predictor';
const ROUTE_MODEL_PATH = 'file://./ai-models/models/route_optimizer';

const createModel = (inputShape: number): tf.Sequential => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputShape], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  return model;
};

const trainModel = async (
  data: { inputs: number[]; fuelUsed: number; eta: number }[],
  labelKey: 'fuelUsed' | 'eta',
  savePath: string
) => {
  const inputs = data.map(d => d.inputs);
  const labels = data.map(d => [d[labelKey]]);
  const inputTensor = tf.tensor2d(inputs);
  const labelTensor = tf.tensor2d(labels);
  const model = createModel(inputs[0].length);

  await model.fit(inputTensor, labelTensor, { epochs: 50, batchSize: 16 });
  await model.save(savePath);
  console.log(`Model saved to ${savePath}`);
};

(async () => {
  const data = await loadCombinedTrainingData();
  await trainModel(data, 'fuelUsed', FUEL_MODEL_PATH);
  await trainModel(data, 'eta', ROUTE_MODEL_PATH);
  await mongoose.disconnect(); // To complete the all remaining processes and exit the script
  console.log('Training complete');
})();
