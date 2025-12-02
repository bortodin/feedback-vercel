import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;

if (!uri) {
  throw new Error('MONGO_URI environment variable is not defined');
}

// Подключение к MongoDB (только один раз)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Схема и модель
const FeedbackSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
});

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Подключаемся к базе данных
    await connectToDatabase();

    if (req.method === 'POST') {
      const { employeeId = 'unknown', rating, comment = '' } = req.body;
      
      // Валидация
      if (!rating) {
        return res.status(400).json({ error: 'Рейтинг обов\'язковий' });
      }

      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Рейтинг має бути від 1 до 5' });
      }

      // Создаем отзыв
      const feedback = await Feedback.create({ 
        employeeId, 
        rating: r, 
        comment: comment.trim() 
      });

      return res.status(201).json({ 
        message: 'Дякуємо за відгук!', 
        feedback: {
          id: feedback._id,
          employeeId: feedback.employeeId,
          rating: feedback.rating,
          timestamp: feedback.timestamp
        }
      });
    }

    if (req.method === 'GET') {
      // Получаем все отзывы, отсортированные по времени
      const data = await Feedback.find()
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Помилка сервера', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}