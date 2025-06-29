import { Request, Response } from 'express';
import Voyage from '../models/Voyage';
import { predictETAWithAI, predictFuelWithAI } from '../../ai-models/mlModel';

export const planVoyage = async (req: Request, res: Response) => {
  try {
    const {
      origin,
      destination,
      departureTime,
      cargoWeight,
      Speed_Over_Ground_knots,
      Engine_Power_kW,
      Distance_Traveled_nm,
      Operational_Cost_USD,
      Revenue_per_Voyage_USD,
      Efficiency_nm_per_kWh,
      Ship_Type,
      Route_Type,
      Engine_Type,
      Maintenance_Status,
      Weather_Condition
    } = req.body;

    const input = {
      Speed_Over_Ground_knots,
      Engine_Power_kW,
      Distance_Traveled_nm,
      Operational_Cost_USD,
      Revenue_per_Voyage_USD,
      Efficiency_nm_per_kWh,
      Ship_Type,
      Route_Type,
      Engine_Type,
      Maintenance_Status,
      Weather_Condition
    };

    const plan = await predictETAWithAI(input);
    const fuelEstimate = await predictFuelWithAI(input);

    const voyage = new Voyage({
      origin,
      destination,
      departureTime,
      cargoWeight,
      weather: Weather_Condition,
      plan,
      actuals: {},
      fuelEstimate
    });

    await voyage.save();

    res.status(200).json({ voyageId: voyage._id, plan, fuelEstimate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const getHistory = async (req: Request, res: Response) => {
  try {
    const history = await Voyage.find();
    res.status(200).json(history);
  } catch (err) {
    //@ts-ignore
    res.status(500).json({ error: err.message });
  }
};

export default { planVoyage, getHistory };