import { Anthropic } from '@anthropic-ai/sdk';
import {
  ClaudeConfig,
  ClaudeMessage,
  ClaudeOptions,
  ClaudeResponse,
  ClaudeServiceInterface,
} from './types';

export class ClaudeService implements ClaudeServiceInterface {
  private client: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required but not provided');
    }
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  private async createCompletion(
    messages: ClaudeMessage[],
    options?: ClaudeOptions
  ): Promise<ClaudeResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        top_p: options?.topP ?? this.config.topP,
        top_k: options?.topK ?? this.config.topK,
        stop_sequences: options?.stopSequences ?? this.config.stopSequences,
      });

      // Handle content based on the type
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : JSON.stringify(response.content[0]);

      return {
        id: response.id,
        type: 'message',
        role: 'assistant',
        content,
        model: response.model,
        stop_reason: response.stop_reason,
        stop_sequence: response.stop_sequence,
      };
    } catch (error) {
      console.error('Error in Claude API call:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Invalid or missing Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('model')) {
          throw new Error(`Model error: ${error.message}. Please check if the model is available.`);
        }
      }
      
      throw new Error(`Failed to get response from Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMessage(
    message: string,
    options?: ClaudeOptions
  ): Promise<ClaudeResponse> {
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: message,
      },
    ];
    return this.sendMessages(messages, options);
  }

  async sendMessages(
    messages: ClaudeMessage[],
    options?: ClaudeOptions
  ): Promise<ClaudeResponse> {
    return this.createCompletion(messages, options);
  }
} 