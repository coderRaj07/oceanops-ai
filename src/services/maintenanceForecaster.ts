import Maintenance from '../models/Maintenance';

export const forecastMaintenance = async () => {
  const records = await Maintenance.find();
  const now = new Date();
  return records.map(m => ({
    shipId: m.shipId,
    nextService: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30) // 30 days
  }));
};