import { Injectable } from '@angular/core';
import { VectorStoreService } from './vector-store.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LMStudioCompletionRequest {
  model: string;
  prompt: string;   // ✅ FIXED: Use "prompt" instead of "messages"
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

interface LMStudioCompletionResponse {
  choices?: { text?: string }[]; // ✅ FIXED: OpenAI format uses `text`, not `message.content`
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages = new BehaviorSubject<Message[]>([]);
  private isLoading = new BehaviorSubject<boolean>(false);
  private isVectorStoreReady = false;
  
  constructor(
    private vectorStore: VectorStoreService,
    private http: HttpClient
  ) {
    this.vectorStore.isReady().subscribe(ready => {
      this.isVectorStoreReady = ready;
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
    this.addMessage('assistant', "Hi! I'm Mark Musk, your CreditChek Developer Assistant. How can I help you today?");
  }
  
  async sendMessage(content: string, preferredLanguage: string = 'python'): Promise<void> {
    if (!content.trim()) return;
    
    this.addMessage('user', content);
    this.isLoading.next(true);
    
    try {
      if (!this.isVectorStoreReady) {
        throw new Error('Vector store not yet loaded');
      }
      
      const searchResults = await this.vectorStore.queryVectorStore(content, 5);
      const context = this.formatSearchResults(searchResults);
      const prompt = this.buildPrompt(content, context, preferredLanguage);
      
      const response = await this.generateLmStudioResponse(prompt);
      
      this.addMessage('assistant', response);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      this.addMessage('assistant', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.next(false);
    }
  }
  
  private addMessage(role: 'user' | 'assistant', content: string): void {
    const currentMessages = this.messages.value;
    this.messages.next([...currentMessages, { role, content, timestamp: new Date() }]);
  }
  
  private formatSearchResults(results: any[]): string {
    if (!results.length) return "No relevant documentation found.";
    
    return results.map(result => {
      const metadata = result.metadata || {};
      return `DOCUMENT: ${metadata.title || 'Untitled'}\nURL: ${metadata.url || 'No URL'}\n${result.document}\n---`;
    }).join('\n');
  }
  
  private buildPrompt(query: string, context: string, preferredLanguage: string): string {
    return `
You are Mark Musk, the CreditChek Developer Assistant bot. Your job is to help software engineers integrate CreditChek's REST APIs.

Context:
${context}

USER QUERY: ${query}
`;
  }
  
  private async generateLmStudioResponse(prompt: string): Promise<string> {
    try {
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

      const requestBody: LMStudioCompletionRequest = {
        model: environment.lmStudioModel,
        prompt: prompt,  // ✅ FIXED: Use `prompt` instead of `messages`
        temperature: 0.7,
        max_tokens: 1024,
        stream: false
      };

      console.log("🟢 Sending request to LM Studio:", JSON.stringify(requestBody, null, 2));

      const response = await this.http.post<LMStudioCompletionResponse>(
        environment.lmStudioEndpoint, // ✅ FIXED: Ensure correct endpoint
        requestBody,
        { headers }
      ).toPromise();

      console.log("🟢 LM Studio response:", JSON.stringify(response, null, 2));

      if (!response || !response.choices || !response.choices[0]?.text) {
        throw new Error('Invalid response from LM Studio: Missing choices or text field');
      }

      return response.choices[0].text.trim();
    } catch (error) {
      console.error('❌ Error calling LM Studio:', error);
      throw new Error('Failed to generate response from the AI model');
    }
  }

  async testPromptConnection(): Promise<void> {
    try {
      console.log("🟢 Testing LM Studio connection...");

      const requestBody = {
        model: environment.lmStudioModel,
        prompt: "Hello!",  // ✅ FIXED: Use `prompt`
        temperature: 0.7,
        max_tokens: 1024,
        stream: false
      };

      console.log("🟢 Test Request:", JSON.stringify(requestBody, null, 2));

      const response = await this.http.post<LMStudioCompletionResponse>(
        environment.lmStudioEndpoint,
        requestBody,
        { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
      ).toPromise();

      console.log("🟢 Test Response:", JSON.stringify(response, null, 2));

      if (response && response.choices && response.choices.length > 0 && response.choices[0].text) {
        console.log("✅ Test successful:", response.choices[0].text);
      } else {
        console.error("❌ Test failed: No valid response received.");
      }
    } catch (error) {
      console.error("❌ LM Studio test failed:", error);
    }
  }
}
