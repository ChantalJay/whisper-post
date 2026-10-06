export interface Prompt {
  subject: string;
  body: string;
}

export interface PromptCategory {
  id: string;
  label: string;
  emoji: string;
  prompts: Prompt[];
}

export const promptCategories: PromptCategory[] = [
  {
    id: 'confession',
    label: 'Secret Confession',
    emoji: '💌',
    prompts: [
      { subject: 'A note I have been meaning to send', body: 'There is something I have wanted to tell you for a while. You make ordinary days feel a little brighter.' },
      { subject: 'A quiet truth', body: 'I really admire how thoughtful you are. I hope you know the difference that makes to people around you.' }
    ]
  },
  {
    id: 'admirer',
    label: 'Secret Admirer',
    emoji: '🌹',
    prompts: [
      { subject: 'Someone thinks you are wonderful', body: 'Your laugh is contagious, and your kindness never goes unnoticed. Someone is cheering you on from afar.' },
      { subject: 'A little appreciation', body: 'You have a way of making people feel welcome. I hope someone tells you how special that is today.' }
    ]
  },
  {
    id: 'apology',
    label: 'Soft Apology',
    emoji: '🕊️',
    prompts: [
      { subject: 'I owe you an apology', body: 'I have been thinking about how I handled things, and I am sorry. You deserved more care from me.' },
      { subject: 'A small olive branch', body: 'I am sorry for the hurt I caused. I do not expect a reply; I only wanted to acknowledge it.' }
    ]
  },
  {
    id: 'riddle',
    label: 'Playful Riddles',
    emoji: '🎭',
    prompts: [
      { subject: 'A tiny brain teaser', body: 'What has keys but cannot open a lock? (A piano!)' },
      { subject: 'Can you solve this?', body: 'What gets wetter the more it dries? (A towel!)' }
    ]
  },
  {
    id: 'feedback',
    label: 'Gentle Feedback',
    emoji: '💡',
    prompts: [
      { subject: 'A kind thought from a colleague', body: 'You bring great ideas to the table. Making a little more room for others to share theirs could make your teamwork even stronger.' },
      { subject: 'A gentle reminder', body: 'You do not have to do everything yourself. Asking for support is a strength, and people are glad to help.' }
    ]
  },
  {
    id: 'positivity',
    label: 'Positivity Boost',
    emoji: '✨',
    prompts: [
      { subject: 'In case you need to hear this', body: 'You are doing better than you think. Take a breath, notice how far you have come, and keep going at your own pace.' },
      { subject: 'A little encouragement', body: 'Your kindness matters more than you know. I hope something lovely finds its way to you today.' }
    ]
  }
];
