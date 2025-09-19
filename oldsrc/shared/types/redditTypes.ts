export type ScoringMode = 'contrarian' | 'conformist' | 'trivia';
export type QuestionType = 'multiple-choice' | 'sequence';

export type GameCard = {
  id: string;
  text: string;
  isCorrect?: boolean; // For trivia mode
  sequenceOrder?: number; // For sequence questions
};

export type Question = {
  id: string;
  prompt: string;
  cards: GameCard[];
  timeLimit: number;
  authorUsername?: string;
  questionType?: QuestionType; // NEW: Type of question
};

export type QuestionStats = {
  questionId: string;
  cardStats: Record<string, number>; // cardId -> count
  positionStats?: Record<string, Record<number, number>>; // New: Position-specific counts
  totalResponses: number;
};

export type Deck = {
  id: string;
  title: string;
  description: string;
  theme: string;
  flairText?: string;  
  flairCSS?: string;
  questions: Question[];
  questionStats?: QuestionStats[]; // NEW: Stats for each question
  
  createdBy: string;
  creatorID? : string;
  createdAt: number;
};

export type GameState = 'waiting' | 'playing' | 'finished';

export type PlayerAnswer = {
  questionId: string;
  answer: string | string[]; // CHANGED: Can be single ID or sequence
  timeRemaining: number;
  timestamp: number;
};

export type PlayerSession = {
  userId: string;
  username: string;
  scoringMode: ScoringMode;
  answers: PlayerAnswer[];
  totalScore: number;
  currentQuestionIndex: number;
  gameState: GameState;
  startedAt: number;
  finishedAt?: number;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  scoringMode: ScoringMode;
  completedAt: number;
};

type Response<T> = { status: 'error'; message: string } | ({ status: 'success' } & T);

export type InitGameResponse = Response<{
  deck: Deck;
  playerSession?: PlayerSession;
}>;

export type SubmitAnswerResponse = Response<{
  score: number;
  questionStats: QuestionStats;
  isGameComplete: boolean;
  nextQuestionIndex?: number;
}>;


export type WebviewToBlockMessage = 
{ type: "INIT" ; 
}|{ 
  type: "CREATE_NEW_POST"; 
  payload: { 
    postData: Deck;
  }
}|{
  type: "GET_LEADERBOARD_DATA" 
}|{
  type : 'COMPLETE_GAME';
  payload : {answers: PlayerAnswer[], totalScore: number , sessionData : PlayerSession }
}|{
  type : "ADD_QUESTION";
  payload: {
    question: Question;
  }
} | {
  type : "GET_POST_DATA";
} | { // New message type for editing a question
  type: "EDIT_QUESTION";
  payload: {
    question: Question;
  };
} | { // New message type for deleting a question
  type: "DELETE_QUESTION";
  payload: {
    questionId: string;
  };
}

export type BlocksToWebviewMessage = {
  type: "INIT_RESPONSE";
  payload: {
    postId: string;
    deck : Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean; // New property for admin status
  };
  } | {
    type : "CONFIRM_SAVE_PLAYER_DATA"
    payload : { isSaved : boolean}
  } | {
    type : "GIVE_LEADERBOARD_DATA";
    payload : {
      leaderboard: LeaderboardEntry[];
      playerRank: number | null;
      playerScore: number | null;
    }
  } | {
    type : "GIVE_POST_DATA";
    payload : {
    postId: string;
    deck : Deck;
    playerSession: PlayerSession | null;
    userId: string;
    username: string;
    playerRank: number | null;
    isAdmin: boolean; // New property for admin status
  }
};

export type DevvitMessage = {
  type: "devvit-message";
  data: { message: BlocksToWebviewMessage };
};
