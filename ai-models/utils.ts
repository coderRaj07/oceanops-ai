import path from "path";

export const normalize = (val: number, min: number, max: number) => (val - min) / (max - min);
export const CSV_PATH = path.join(__dirname, '../ai-models/data/Ship_Performance_Dataset.csv');

// ------------------ Feature Categories ------------------
export const CATEGORIES = {
  Ship_Type: ['Tanker', 'Container Ship', 'Fish Carrier', 'Bulk Carrier'],
  Route_Type: ['Short-haul', 'Long-haul', 'Transoceanic'],
  Engine_Type: ['Diesel', 'Heavy Fuel Oil'],
  Maintenance_Status: ['Fair', 'Critical', 'Good'],
  Weather_Condition: ['Calm', 'Moderate', 'Rough']
};

export const oneHotEncode = (val: string, cats: string[]) => cats.map(c => (c === val ? 1 : 0));

// ------------------ Construct Input for Inference ------------------
export const constructInput = (data: {
  Speed_Over_Ground_knots: number;
  Engine_Power_kW: number;
  Distance_Traveled_nm: number;
  Operational_Cost_USD: number;
  Revenue_per_Voyage_USD: number;
  Efficiency_nm_per_kWh: number;
  Ship_Type: string;
  Route_Type: string;
  Engine_Type: string;
  Maintenance_Status: string;
  Weather_Condition: string;
}): number[] => {
  return [
    data.Speed_Over_Ground_knots,
    data.Engine_Power_kW,
    data.Distance_Traveled_nm,
    data.Operational_Cost_USD,
    data.Revenue_per_Voyage_USD,
    data.Efficiency_nm_per_kWh,
    ...oneHotEncode(data.Ship_Type, CATEGORIES.Ship_Type),
    ...oneHotEncode(data.Route_Type, CATEGORIES.Route_Type),
    ...oneHotEncode(data.Engine_Type, CATEGORIES.Engine_Type),
    ...oneHotEncode(data.Maintenance_Status, CATEGORIES.Maintenance_Status),
    ...oneHotEncode(data.Weather_Condition, CATEGORIES.Weather_Condition)
  ];
};

  