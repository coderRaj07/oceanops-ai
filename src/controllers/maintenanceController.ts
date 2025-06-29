import { Request, Response } from 'express';
import { forecastMaintenance } from '../services/maintenanceForecaster';

const getAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await forecastMaintenance();
    res.status(200).json(alerts);
  } catch (err) {
    //@ts-ignore
    res.status(500).json({ error: err.message });
  }
};

export default { getAlerts };