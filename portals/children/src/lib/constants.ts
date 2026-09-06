// TODO: Replace with real API sources (games registry, learning catalog, chat NLU)
export const GAMES = [
  { key: 'bonding', icon: '🧬', title: 'BONDING', desc: 'Synthesize atoms into molecules', spoons: 2 },
  { key: 'chain', icon: '🔗', title: 'Chain', desc: 'Build trust links with peers', spoons: 1 },
  { key: 'pattern', icon: '🧩', title: 'Pattern', desc: 'Match shapes and sequences', spoons: 1 },
  { key: 'quest', icon: '🗺️', title: 'Quest', desc: 'Explore the mesh together', spoons: 3 },
];

export const TOPICS = [
  { key: 'emotions', icon: '❤️', title: 'Feelings & Emotions', desc: 'Learn to name what you feel' },
  { key: 'science', icon: '🔬', title: 'Science Lab', desc: 'Discover how the world works' },
  { key: 'art', icon: '🎨', title: 'Creative Studio', desc: 'Draw, paint, and make music' },
  { key: 'nature', icon: '🌿', title: 'Nature Walk', desc: 'Explore plants and animals' },
];

export const MOODS = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'calm', emoji: '😌', label: 'Calm' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'worried', emoji: '😟', label: 'Worried' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'tired', emoji: '😴', label: 'Tired' },
  { key: 'excited', emoji: '🤩', label: 'Excited' },
  { key: 'lonely', emoji: '😔', label: 'Lonely' },
];

export const MOOD_MESSAGES: Record<string, string> = {
  happy: 'That\'s wonderful! Keep shining!',
  calm: 'Peace is a superpower.',
  sad: 'It\'s okay to feel sad. I\'m here with you.',
  worried: 'Let\'s take it one step at a time.',
  angry: 'Take a deep breath. You\'re safe.',
  tired: 'Rest is important. Be gentle with yourself.',
  excited: 'Amazing! What are you excited about?',
  lonely: 'You\'re not alone. I\'m right here.',
};

export const CHAT_RESPONSES: Record<string, string> = {
  'hello': 'Hi there! How are you feeling today?',
  'hi': 'Hello! What\'s on your mind?',
  'how are you': 'I\'m here for you. How about you?',
  'i\'m sad': 'I\'m sorry you\'re feeling sad. Want to talk about it?',
  'i\'m worried': 'It\'s okay to worry. Let\'s work through it together.',
  'help': 'I\'m here to help. Tell me more.',
  'bye': 'Take care! I\'ll be here when you need me.',
};

export const DEFAULT_CHAT_RESPONSE = 'I hear you. Tell me more about that.';
