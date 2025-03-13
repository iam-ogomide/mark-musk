import { Injectable } from '@angular/core';
import { VectorStoreService } from './vector-store.service';
import { HfInference } from '@huggingface/inference';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages = new BehaviorSubject<Message[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private hf: HfInference;
  private isVectorStoreReady = false;
  
  constructor(
    private vectorStore: VectorStoreService,
    private http: HttpClient
  ) {
    // Initialize Hugging Face client with API key from environment
    this.hf = new HfInference(environment.huggingfaceApiKey);
    
    // Subscribe to vector store ready state
    this.vectorStore.isReady().subscribe(ready => {
      this.isVectorStoreReady = ready;
      
      // If we're ready and have no messages, add the welcome message
      if (ready && this.messages.value.length === 0) {
        this.addWelcomeMessage();
      }
    });
  }
  
  getMessages(): Observable<Message[]> {
    return this.messages.asObservable();
  }
  
  getLoadingState(): Observable<boolean> {
    return this.isLoading.asObservable();
  }
  
  private addWelcomeMessage(): void {
    this.addMessage('assistant', 
      "Hi! I'm Mark Musk, your CreditChek Developer Assistant. How can I help you integrate with CreditChek's API today?"
    );
  }
  
  async sendMessage(content: string, preferredLanguage: string = 'python'): Promise<void> {
    if (!content.trim()) return;
    
    // Add user message
    this.addMessage('user', content);
    this.isLoading.next(true);
    
    try {
      // Check if vector store is ready
      if (!this.isVectorStoreReady) {
        throw new Error('Vector store not yet loaded');
      }
      
      // Search for relevant documentation
      const searchResults = await this.vectorStore.queryVectorStore(content, 5);
      
      // Format context from search results
      const context = this.formatSearchResults(searchResults);
      
      // Build the prompt
      const prompt = this.buildPrompt(content, context, preferredLanguage);
      
      // Get response from LLM
      const response = await this.generateLlmResponse(prompt);
      
      // Add assistant message
      this.addMessage('assistant', response);
    } catch (error) {
      console.error('Error processing message:', error);
      this.addMessage('assistant', 
        'I encountered an error while processing your request. Please try again later.' + 
        (environment.production ? '' : ` Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    } finally {
      this.isLoading.next(false);
    }
  }
  
  private addMessage(role: 'user' | 'assistant', content: string): void {
    const currentMessages = this.messages.value;
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date()
    };
    this.messages.next([...currentMessages, newMessage]);
  }
  
  private formatSearchResults(results: any[]): string {
    if (!results.length) {
      return "No relevant documentation found.";
    }
    
    return results.map(result => {
      const metadata = result.metadata || {};
      return `
DOCUMENT: ${metadata.title || 'Untitled Document'}
URL: ${metadata.url || 'No URL provided'}
TYPE: ${metadata.type || 'Unknown'}
${metadata.language ? `LANGUAGE: ${metadata.language}` : ''}
SIMILARITY: ${(result.similarity * 100).toFixed(2)}%

CONTENT:
${result.document}
---
`;
    }).join('\n');
  }
  
  private buildPrompt(query: string, context: string, preferredLanguage: string): string {
    return `
You are Mark Musk, the CreditChek Developer Assistant bot. Your purpose is to help software engineers integrate CreditChek's REST APIs by providing clear explanations, code examples, and best practices.

Your knowledge is based on the following CreditChek documentation:

${context}

Please answer the following question or fulfill the request. If you're asked to provide code examples, prioritize examples in ${preferredLanguage} if available, but you can also generate new examples based on the documentation. Format code blocks properly with the language specified.

Remember:
1. Be concise and focused on the developer's needs
2. Include relevant code examples when possible
3. If you don't know the answer, admit it rather than making up information
4. Format your response for clarity with headers, lists, and code blocks as needed

USER QUERY: ${query}
`;
  }
  
  private async generateLlmResponse(prompt: string): Promise<string> {
    try {
      // Call Hugging Face Inference API
      const response = await this.hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true
        }
      });
      
      // Process the response to remove any prompt residue
      let generatedText = response.generated_text || '';
      
      // Clean up the response by removing any part of the prompt that might be echoed back
      const promptEnd = "USER QUERY:";
      const promptEndPos = prompt.lastIndexOf(promptEnd);
      if (promptEndPos !== -1) {
        const userQuery = prompt.substring(promptEndPos + promptEnd.length).trim();
        if (generatedText.startsWith(userQuery)) {
          generatedText = generatedText.substring(userQuery.length).trim();
        }
      }
      
      return generatedText;
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw new Error('Failed to generate response from the AI model');
    }
  }
}
