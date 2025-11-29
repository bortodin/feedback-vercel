import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;

if (!mongoose.connection.readyState) {
  mongoose.connect(uri, { tls: true, family: 4 });
}

const FeedbackSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { employeeId = 'unknown', rating, comment = '' } = req.body;
      const r = parseInt(rating, 10);
      if (r < 1 || r > 5) return res.status(400).json({ error: 'Рейтинг 1–5' });

      await Feedback.create({ employeeId, rating: r, comment });
      return res.status(201).json({ message: 'Дякуємо!' });
    } catch (e) {
      return res.status(500).json({ error: 'Помилка' });
    }
  }

  if (req.method === 'GET') {
    const data = await Feedback.find().sort({ timestamp: -1 });
    return res.json(data);
  }

  res.status(405).end();
}