// Servidor da lanchonete (Netlify Functions + Netlify Blobs)
import { getStore } from '@netlify/blobs';
import { criarApi } from '../lib/servidor.mjs';

export default async (req) =>
  criarApi(getStore({ name: 'lanchonete', consistency: 'strong' }), process.env)(req);

export const config = { path: '/api/*' };
