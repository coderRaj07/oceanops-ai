import mongoose from 'mongoose';
import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

import connectDB from '../src/utils/db';
import Voyage from '../src/models/Voyage';
import Maintenance from '../src/models/Maintenance';
import Ship from '../src/models/Ship';
import { oneHotEncode, CATEGORIES } from './utils';

const MODEL_PATH = 'file://./ai-models/models/maintenance_forecaster';
const CSV_PATH = path.join(__dirname, './data/Ship_Performance_Dataset.csv');

// ---------- Load Training Data from MongoDB ----------
const loadMongoData = async (): Promise<{ input: number[]; label: number }[]> => {
  const dataset: { input: number[]; label: number }[] = [];

  const maintenances = await Maintenance.find({ nextForecastedService: { $exists: true } });
  for (const m of maintenances) {
    const ship = await Ship.findById(m.shipId);
    const voyages = await Voyage.find({ shipId: m.shipId, actuals: { $exists: true } });

    if (!ship || voyages.length === 0) continue;

    const recent = voyages.slice(-5); // use last 5 voyages
    const avg = (key: keyof typeof recent[0]['actuals']) =>
      //@ts-ignore
      recent.reduce((acc, v) => acc + (v.actuals[key] ?? 0), 0) / recent.length;

    const input = [
      //@ts-ignore
      avg('Speed_Over_Ground_knots'),
      //@ts-ignore
      avg('Engine_Power_kW'),
      //@ts-ignore
      avg('Distance_Traveled_nm'),
      //@ts-ignore
      avg('Operational_Cost_USD'),
      //@ts-ignore
      avg('Revenue_per_Voyage_USD'),
      //@ts-ignore
      avg('Efficiency_nm_per_kWh'),
      ...oneHotEncode(ship.type || 'Tanker', CATEGORIES.Ship_Type),
      ...oneHotEncode('Long-haul', CATEGORIES.Route_Type), // estimated route type
      ...oneHotEncode(ship.engineType || 'Diesel', CATEGORIES.Engine_Type),
      ...oneHotEncode(m.maintenanceStatus || 'Good', CATEGORIES.Maintenance_Status),
      ...oneHotEncode(recent[0].weather || 'Calm', CATEGORIES.Weather_Condition),
      m.recordedIssues.length
    ];

    
    const daysUntilService = Math.max(1, Math.ceil(//@ts-ignore
      (new Date(m.nextForecastedService).getTime() - Date.now()) / (86400 * 1000)
    ));

    dataset.push({ input, label: daysUntilService });
  }

  return dataset;
};

// ---------- Load Training Data from CSV ----------
const loadCSVData = (): Promise<{ input: number[]; label: number }[]> => {
  return new Promise((resolve, reject) => {
    const results: { input: number[]; label: number }[] = [];

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        try {
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
            ...oneHotEncode(row.Weather_Condition, CATEGORIES.Weather_Condition),
            parseInt(row.Issue_Count || '0') || 0
          ];

          const label = parseInt(row.Days_Until_Next_Service || '30'); // default 30 days if not provided
          if (!isNaN(label)) {
            results.push({ input, label });
          }
        } catch (err) {
          console.warn('⚠️ Invalid CSV row, skipped.');
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// ---------- Train & Save the Model ----------
// 🧠 Predict and update next service dates
const predictAndUpdateForecasts = async () => {
    const model = await tf.loadLayersModel(MODEL_PATH + '/model.json');
    const maintenances = await Maintenance.find({});
  
    for (const m of maintenances) {
      const ship = await Ship.findById(m.shipId);
      const voyages = await Voyage.find({ shipId: m.shipId, actuals: { $exists: true } });
  
      if (!ship || voyages.length === 0) continue;
  
      const recent = voyages.slice(-5);
      const avg = (key: keyof typeof recent[0]['actuals']) =>
        //@ts-ignore
        recent.reduce((acc, v) => acc + (v.actuals[key] ?? 0), 0) / recent.length;
  
      const input = [
        //@ts-ignore
        avg('Speed_Over_Ground_knots'),
        //@ts-ignore
        avg('Engine_Power_kW'),
        //@ts-ignore
        avg('Distance_Traveled_nm'),
        //@ts-ignore
        avg('Operational_Cost_USD'),
        //@ts-ignore
        avg('Revenue_per_Voyage_USD'),
        //@ts-ignore
        avg('Efficiency_nm_per_kWh'),
        ...oneHotEncode(ship.type || 'Tanker', CATEGORIES.Ship_Type),
        ...oneHotEncode('Long-haul', CATEGORIES.Route_Type),
        ...oneHotEncode(ship.engineType || 'Diesel', CATEGORIES.Engine_Type),
        ...oneHotEncode(m.maintenanceStatus || 'Good', CATEGORIES.Maintenance_Status),
        ...oneHotEncode(recent[0].weather || 'Calm', CATEGORIES.Weather_Condition),
        m.recordedIssues.length
      ];
  
      const inputTensor = tf.tensor2d([input]);
      const predictedDays = (await model.predict(inputTensor).data())[0];
  
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + Math.round(predictedDays));
  
      await Maintenance.updateOne(
        { _id: m._id },
        { $set: { nextForecastedService: nextDate } }
      );
  
      console.log(`🔧 Updated ship ${m.shipId} next service to ${nextDate.toDateString()}`);
    }
  };

  
const train = async () => {
  await connectDB();

  const mongoData = await loadMongoData();
  const csvData = await loadCSVData();
  const combined = [...mongoData, ...csvData];

  if (combined.length === 0) {
    console.error('No training data available');
    return;
  }

  const xs = tf.tensor2d(combined.map(d => d.input));
  const ys = tf.tensor2d(combined.map(d => [d.label]));

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [xs.shape[1]], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  console.log('Starting training...');
  await model.fit(xs, ys, { epochs: 50, batchSize: 16 });
  await model.save(MODEL_PATH);
  console.log('Maintenance model trained and saved');

  // 🔮 Predict and update DB
  await predictAndUpdateForecasts()

  await mongoose.disconnect();
};

train().catch(err => {
  console.error('Training failed:', err);
  process.exit(1);
});