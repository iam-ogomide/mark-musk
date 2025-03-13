import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ChatService, Message } from '../../services/chat.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VectorStoreService } from '../../services/vector-store.service';
import { Subscription } from 'rxjs';
import 'highlight.js/styles/github.css';
import hljs from 'highlight.js';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {

  messages: Message[] = [];
  chatForm!: FormGroup;
  isLoading = false;
  preferredLanguage = 'python';
  isVectorStoreReady = false;
  private subscriptions: Subscription[] = [];
  
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;
  
  languages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript/Node.js' },
    { value: 'php', label: 'PHP/Laravel' },
    { value: 'go', label: 'GoLang' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'java', label: 'Java' }
  ];
  
  constructor(
    private chatService: ChatService,
    private vectorStore: VectorStoreService,
    private fb: FormBuilder
  ) {
    this.chatForm = this.fb.group({
      message: ['', Validators.required]
    });
  }
  
  ngOnInit(): void {
    this.subscriptions.push(
      this.chatService.getMessages().subscribe(messages => {
        this.messages = messages;
        setTimeout(() => this.highlightCode(), 100);
      }),
      
      this.chatService.getLoadingState().subscribe(isLoading => {
        this.isLoading = isLoading;
      }),
      
      this.vectorStore.isReady().subscribe(ready => {
        this.isVectorStoreReady = ready;
      })
    );
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }
  
  sendMessage(): void {
    if (this.chatForm.invalid || this.isLoading) {
      return;
    }
  
    const message = this.chatForm.value.message.trim();
    
    if (message) {
      this.chatService.sendMessage(message, this.preferredLanguage);
      this.chatForm.reset();
    }
  }
  
  
  changePreferredLanguage(language: string): void {
    this.preferredLanguage = language;
  }
  
  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  private highlightCode(): void {
    document.querySelectorAll('pre code').forEach((block) => {
      // Use the correct highlight.js API
      hljs.highlightElement(block as HTMLElement);
    });
  }
  
  formatMessage(content: string): string {
    if (!content) return '';
    
    // Format code blocks with syntax highlighting
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const lang = language || 'plaintext';
      let highlightedCode;
      
      try {
        // Use the correct highlight.js API
        highlightedCode = hljs.highlight(code.trim(), { language: lang }).value;
      } catch (e) {
        // Fallback if language not supported
        highlightedCode = hljs.highlightAuto(code.trim()).value;
      }
      
      return `<div class="code-block-header">${lang}</div><pre><code class="language-${lang}">${highlightedCode}</code></pre>`;
    });
  }
  
  // Handle pressing Enter to send message
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Add this method to your ChatComponent class
async testConnection(): Promise<void> {
  this.isLoading = true;
  try {
    const response = await this.chatService.testPromptConnection();
    console.log("Test successful:", response);
    // Display the response in the UI
    this.addTestMessage('Test successful: ' + response);
  } catch (error) {
    console.error("Test failed:", error);
    // Display error in the UI
    this.addTestMessage('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  } finally {
    this.isLoading = false;
  }
}

// Helper method to add test messages
private addTestMessage(content: string): void {
  const testMessage: Message = {
    role: 'assistant',
    content: content,
    timestamp: new Date()
  };
  this.messages = [...this.messages, testMessage];
}



}
