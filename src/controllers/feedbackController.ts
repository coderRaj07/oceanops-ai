import { Request, Response } from 'express';
import Voyage from '../models/Voyage';

const submitFeedback = async (req: Request, res: Response) => {
    try {
      const { voyageId, actuals } = req.body;
      const voyage = await Voyage.findByIdAndUpdate(
        voyageId,
        { actuals, feedbackAt: new Date() },
        { new: true }
      );
      res.status(200).json({ updated: voyage });
    } catch (err) {
        //@ts-ignore
      res.status(500).json({ error: err.message });
    }
  };
  

export default { submitFeedback };