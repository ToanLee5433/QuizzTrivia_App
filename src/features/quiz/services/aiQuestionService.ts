import { Question } from '../pages/CreateQuizPage/types';

export interface AIProvider {
  name: string;
  id: 'openai' | 'claude' | 'gemini' | 'ollama';
  description: string;
  models: string[];
  requiresApiKey: boolean;
  free: boolean;
}

export interface AIConfig {
  provider: AIProvider['id'];
  apiKey?: string;
  model: string;
  temperature: number;
  maxQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple' | 'boolean' | 'short_answer')[];
  language: 'vi' | 'en';
}

export interface GenerateQuestionsRequest {
  content: string;
  config: AIConfig;
  customPrompt?: string;
  category?: string;
  context?: string;
}

export interface GenerateQuestionsResponse {
  questions: Question[];
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  error?: string;
}

class AIQuestionService {
  private static instance: AIQuestionService;
  
  static getInstance(): AIQuestionService {
    if (!AIQuestionService.instance) {
      AIQuestionService.instance = new AIQuestionService();
    }
    return AIQuestionService.instance;
  }

  // Available AI providers
  readonly providers: AIProvider[] = [
    {
      name: 'OpenAI GPT',
      id: 'openai',
      description: 'GPT-4 và GPT-3.5 từ OpenAI - Chất lượng cao, đa dạng câu hỏi',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      requiresApiKey: true,
      free: false
    },
    {
      name: 'Claude (Anthropic)',
      id: 'claude',
      description: 'Claude 3 từ Anthropic - Tư duy logic tốt, an toàn',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      requiresApiKey: true,
      free: false
    },
    {
      name: 'Google Gemini',
      id: 'gemini',
      description: 'Gemini Pro từ Google - Hiểu ngữ cảnh tốt, miễn phí hạn chế',
      models: ['gemini-pro', 'gemini-pro-vision'],
      requiresApiKey: true,
      free: true
    },
    {
      name: 'Ollama (Local)',
      id: 'ollama',
      description: 'Chạy local với Llama, Mistral, CodeLlama - Hoàn toàn miễn phí',
      models: ['llama2', 'mistral', 'codellama', 'phi', 'neural-chat'],
      requiresApiKey: false,
      free: true
    }
  ];

  // Default configurations for each provider
  private getDefaultConfig(providerId: AIProvider['id']): Partial<AIConfig> {
    switch (providerId) {
      case 'openai':
        return {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxQuestions: 10
        };
      case 'claude':
        return {
          model: 'claude-3-sonnet',
          temperature: 0.6,
          maxQuestions: 10
        };
      case 'gemini':
        return {
          model: 'gemini-pro',
          temperature: 0.8,
          maxQuestions: 8
        };
      case 'ollama':
        return {
          model: 'llama2',
          temperature: 0.7,
          maxQuestions: 6
        };
      default:
        return {};
    }
  }

  // Generate system prompt based on config
  private generateSystemPrompt(config: AIConfig): string {
    const { difficulty, questionTypes, language, maxQuestions } = config;
    
    const difficultyText = {
      easy: 'dễ (học sinh trung học cơ sở)',
      medium: 'trung bình (học sinh trung học phổ thông)',
      hard: 'khó (sinh viên đại học)',
      mixed: 'đa dạng từ dễ đến khó'
    };

    const typeText = {
      multiple: 'trắc nghiệm nhiều lựa chọn (4 đáp án, 1 đúng)',
      boolean: 'đúng/sai',
      short_answer: 'trả lời ngắn'
    };

    const selectedTypes = questionTypes.map(t => typeText[t]).join(', ');
    const lang = language === 'vi' ? 'tiếng Việt' : 'English';

    return `Bạn là một chuyên gia tạo câu hỏi trắc nghiệm chuyên nghiệp. 

NHIỆM VỤ: Tạo ${maxQuestions} câu hỏi chất lượng cao từ nội dung được cung cấp.

YÊU CẦU:
- Độ khó: ${difficultyText[difficulty]}
- Loại câu hỏi: ${selectedTypes}
- Ngôn ngữ: ${lang}
- Câu hỏi phải chính xác, rõ ràng và có giá trị giáo dục
- Đáp án phải chính xác 100%
- Tránh câu hỏi quá dễ hoặc mơ hồ

FORMAT TRẢI LỜI (JSON):
{
  "questions": [
    {
      "id": "unique_id",
      "text": "Nội dung câu hỏi",
      "type": "multiple|boolean|short_answer",
      "answers": [
        {"id": "ans1", "text": "Đáp án A", "isCorrect": true},
        {"id": "ans2", "text": "Đáp án B", "isCorrect": false},
        {"id": "ans3", "text": "Đáp án C", "isCorrect": false},
        {"id": "ans4", "text": "Đáp án D", "isCorrect": false}
      ],
      "points": 1,
      "explanation": "Giải thích tại sao đáp án này đúng"
    }
  ]
}

CHỈ TRẢ VỀ JSON, KHÔNG THÊM TEXT KHÁC.`;
  }

  // Generate questions using selected AI provider
  async generateQuestions(request: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
    const { content, config, customPrompt } = request;

    try {
      switch (config.provider) {
        case 'openai':
          return await this.generateWithOpenAI(content, config, customPrompt);
        case 'claude':
          return await this.generateWithClaude(content, config, customPrompt);
        case 'gemini':
          return await this.generateWithGemini(content, config, customPrompt);
        case 'ollama':
          return await this.generateWithOllama(content, config, customPrompt);
        default:
          throw new Error(`Unsupported AI provider: ${config.provider}`);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      return {
        questions: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async generateWithOpenAI(content: string, config: AIConfig, customPrompt?: string): Promise<GenerateQuestionsResponse> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const systemPrompt = customPrompt || this.generateSystemPrompt(config);
    const userPrompt = `Nội dung để tạo câu hỏi:\n\n${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.temperature,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const questionsJson = JSON.parse(data.choices[0].message.content);
    
    return {
      questions: this.formatQuestions(questionsJson.questions),
      usage: data.usage
    };
  }

  private async generateWithGemini(content: string, config: AIConfig, customPrompt?: string): Promise<GenerateQuestionsResponse> {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const prompt = `${customPrompt || this.generateSystemPrompt(config)}\n\nNội dung: ${content}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: 4000
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    const questionsJson = JSON.parse(data.candidates[0].content.parts[0].text);
    
    return {
      questions: this.formatQuestions(questionsJson.questions)
    };
  }

  private async generateWithClaude(content: string, config: AIConfig, customPrompt?: string): Promise<GenerateQuestionsResponse> {
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }

    const systemPrompt = customPrompt || this.generateSystemPrompt(config);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4000,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Nội dung để tạo câu hỏi:\n\n${content}` }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const questionsJson = JSON.parse(data.content[0].text);
    
    return {
      questions: this.formatQuestions(questionsJson.questions),
      usage: data.usage
    };
  }

  private async generateWithOllama(content: string, config: AIConfig, customPrompt?: string): Promise<GenerateQuestionsResponse> {
    const prompt = `${customPrompt || this.generateSystemPrompt(config)}\n\nNội dung: ${content}`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: 4000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama not running or model not available. Please install Ollama and pull the ${config.model} model.`);
      }

      const data = await response.json();
      const questionsJson = JSON.parse(data.response);
      
      return {
        questions: this.formatQuestions(questionsJson.questions)
      };
    } catch (error) {
      throw new Error(`Ollama error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Ollama is running on localhost:11434`);
    }
  }

  private formatQuestions(questions: any[]): Question[] {
    return questions.map((q: any) => ({
      id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: q.text || '',
      type: q.type || 'multiple',
      answers: q.answers || [],
      points: q.points || 1,
      correctAnswer: q.correctAnswer || '',
      acceptedAnswers: q.acceptedAnswers || [],
      explanation: q.explanation || ''
    }));
  }

  // Test AI connection
  async testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
    try {
      const testRequest: GenerateQuestionsRequest = {
        content: 'Vietnam is a country in Southeast Asia.',
        config: {
          ...config,
          maxQuestions: 1,
          questionTypes: ['multiple']
        }
      };

      const result = await this.generateQuestions(testRequest);
      
      if (result.error) {
        return { success: false, message: result.error };
      }

      return { 
        success: true, 
        message: `Connected successfully! Generated ${result.questions.length} test question.` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  // Get provider by ID
  getProvider(id: AIProvider['id']): AIProvider | undefined {
    return this.providers.find(p => p.id === id);
  }

  // Create default config for provider
  createDefaultConfig(providerId: AIProvider['id']): AIConfig {
    const defaults = this.getDefaultConfig(providerId);
    return {
      provider: providerId,
      apiKey: '',
      model: defaults.model || this.providers.find(p => p.id === providerId)?.models[0] || '',
      temperature: defaults.temperature || 0.7,
      maxQuestions: defaults.maxQuestions || 10,
      difficulty: 'medium',
      questionTypes: ['multiple'],
      language: 'vi',
      ...defaults
    };
  }
}

export const aiQuestionService = AIQuestionService.getInstance();
