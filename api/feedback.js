import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;

// Логирование для диагностики
console.log('MONGO_URI exists:', !!uri);
console.log('MONGO_URI length:', uri ? uri.length : 0);

if (!uri) {
  console.error('❌ MONGO_URI environment variable is not defined');
}

// Подключение к MongoDB (кэширование)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    console.log('✓ Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log('🔄 Creating new database connection...');
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log('✓ Connected to MongoDB successfully');
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB connection error:', error.message);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('❌ Failed to establish connection:', e.message);
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

  console.log(`📥 ${req.method} request to /api/feedback`);

  // Проверка MONGO_URI
  if (!uri) {
    console.error('❌ MONGO_URI not configured');
    return res.status(500).json({ 
      error: 'Конфігурація сервера: MONGO_URI не налаштовано',
      hint: 'Перевірте Environment Variables в Vercel'
    });
  }

  try {
    // Подключаемся к базе данных
    await connectToDatabase();

    if (req.method === 'POST') {
      console.log('📝 Processing POST request');
      const { employeeId = 'unknown', rating, comment = '' } = req.body;
      
      console.log('Data received:', { employeeId, rating, commentLength: comment.length });

      // Валидация
      if (!rating) {
        console.log('❌ Validation failed: rating is required');
        return res.status(400).json({ error: 'Рейтинг обов\'язковий' });
      }

      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) {
        console.log('❌ Validation failed: invalid rating value');
        return res.status(400).json({ error: 'Рейтинг має бути від 1 до 5' });
      }

      // Создаем отзыв
      const feedback = await Feedback.create({ 
        employeeId, 
        rating: r, 
        comment: comment.trim() 
      });

      console.log('✓ Feedback created successfully:', feedback._id);

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
      console.log('📖 Processing GET request');
      // Получаем все отзывы, отсортированные по времени
      const data = await Feedback.find()
        .sort({ timestamp: -1 })
        .limit(1000)
        .lean();

      console.log(`✓ Retrieved ${data.length} feedback records`);
      return res.status(200).json(data);
    }

    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Помилка сервера', 
      message: error.message,
      hint: 'Перевірь підключення до MongoDB Atlas та налаштування Network Access'
    });
  }
}

