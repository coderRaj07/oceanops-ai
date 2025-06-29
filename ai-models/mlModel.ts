import * as tf from '@tensorflow/tfjs-node';
import OpenAI from 'openai';
import path from 'path';
import { constructInput } from './utils';
import { OPENAI_API_KEY } from '../src/config';

const FUEL_MODEL_PATH = path.join(__dirname, '../models/fuel_predictor');
const ROUTE_MODEL_PATH = path.join(__dirname, '../models/route_optimizer');
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ------------------ Predict Functions ------------------
export async function predictFuelWithAI(data: Parameters<typeof constructInput>[0]): Promise<number> {
  const input = constructInput(data);
  try {
    const model = await tf.loadLayersModel(`file://${FUEL_MODEL_PATH}/model.json`);
    const result = model.predict(tf.tensor2d([input])) as tf.Tensor;
    return (await result.data())[0];
  } catch (err) {
    //@ts-ignore
    console.warn('⚠️ TFJS fuel model failed, fallback to GPT:', err.message);
    const resp = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Estimate fuel usage for this ship: ${JSON.stringify(data)}` }]
    });
    return parseFloat(resp.choices[0].message.content || '0');
  }
}

export async function predictETAWithAI(data: Parameters<typeof constructInput>[0]): Promise<number> {
  const input = constructInput(data);
  try {
    const model = await tf.loadLayersModel(`file://${ROUTE_MODEL_PATH}/model.json`);
    const result = model.predict(tf.tensor2d([input])) as tf.Tensor;
    return (await result.data())[0];
  } catch (err) {
    //@ts-ignore
    console.warn('⚠️ TFJS ETA model failed, fallback to GPT:', err.message);
    const resp = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Estimate ETA for this ship: ${JSON.stringify(data)}` }]
    });
    return parseFloat(resp.choices[0].message.content || '0');
  }
}