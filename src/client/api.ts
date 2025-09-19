import { Deck, PlayerSession, LeaderboardEntry, Question } from '../shared/types/game';

export interface InitResponse {
  postId: string;
  deck: Deck;
  playerSession?: PlayerSession;
  playerRank?: number;
  userId: string;
  username: string;
  isAdmin: boolean;
}

export interface CompleteGameRequest {
  answers: any[];
  totalScore: number;
  sessionData: PlayerSession;
}

export interface CompleteGameResponse {
  status: string;
  finalScore: number;
  session: PlayerSession;
  leaderboardUpdated: boolean;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  playerRank?: number;
  playerScore?: number;
}

export interface AddQuestionRequest {
  question: Question;
}

export interface EditQuestionRequest {
  question: Question;
}

export interface DeleteQuestionRequest {
  questionId: string;
}

export interface CreatePostRequest {
  postData: any;
}

export const api = {
  async init(): Promise<InitResponse> {
    const response = await fetch('/api/init');
    if (!response.ok) {
      throw new Error('Failed to initialize');
    }
    return response.json();
  },

  async completeGame(data: CompleteGameRequest): Promise<CompleteGameResponse> {
    const response = await fetch('/api/complete-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to complete game');
    }
    return response.json();
  },

  async getLeaderboard(type: 'top' | 'near' = 'top'): Promise<LeaderboardResponse> {
    const response = await fetch(`/api/leaderboard?type=${type}`);
    if (!response.ok) {
      throw new Error('Failed to get leaderboard');
    }
    return response.json();
  },

  async addQuestion(data: AddQuestionRequest): Promise<{ status: string; questionId: string }> {
    const response = await fetch('/api/add-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to add question');
    }
    return response.json();
  },

  async editQuestion(data: EditQuestionRequest): Promise<{ status: string }> {
    const response = await fetch('/api/edit-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to edit question');
    }
    return response.json();
  },

  async deleteQuestion(data: DeleteQuestionRequest): Promise<{ status: string }> {
    const response = await fetch('/api/delete-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to delete question');
    }
    return response.json();
  },

  async getPostData(): Promise<InitResponse> {
    const response = await fetch('/api/post-data');
    if (!response.ok) {
      throw new Error('Failed to get post data');
    }
    return response.json();
  },

  async createNewPost(data: CreatePostRequest): Promise<{ status: string; showToast?: any; navigateTo?: any }> {
    const response = await fetch('/api/create-post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create post');
    }
    return response.json();
  },
};