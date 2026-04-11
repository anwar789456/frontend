import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AnalyticsChatbotService, Message, ChatResponse } from '../../services/analytics-chatbot.service';
import { AnalyticsDashboard } from '../../services/analytics.service';
import { AuthService } from '../../../../../shared/services/auth.service';

@Component({
  selector: 'app-analytics-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-chatbot.component.html',
  styleUrls: ['./analytics-chatbot.component.css']
})
export class AnalyticsChatbotComponent implements OnInit {
  @Input() analytics?: AnalyticsDashboard | null;

  isChatOpen = false;
  isTyping = false;
  messages: Message[] = [];
  newUserMessage = '';
  unreadCount = 0;

  private chatService: AnalyticsChatbotService;

  constructor(
    chatService: AnalyticsChatbotService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    this.chatService = chatService;
  }

  ngOnInit(): void {
    // Initialize with welcome message (not shown yet)
    this.unreadCount = 1;
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      this.unreadCount = 0;
      if (this.messages.length === 0) {
        this.sendWelcomeMessage();
      }
      this.scrollToBottom();
    }
  }

  closeChat(): void {
    this.isChatOpen = false;
  }

  sendWelcomeMessage(): void {
    const userName = this.authService.currentUser?.name || 'Admin';
    const welcomeMsg: Message = {
      id: this.generateMessageId(),
      type: 'ai',
      text: `Hello, ${userName}! 👋 Welcome to MinoLingo Analytics! I'm your AI assistant for the education platform. I can help you understand your subscription data, analyze trends, compare periods, and provide recommendations for our kids' learning platform.`,
      timestamp: new Date()
    };
    this.messages.push(welcomeMsg);
  }

  sendMessage(): void {
    const message = this.newUserMessage.trim();
    if (!message) return;

    // Add user message
    const userMessage: Message = {
      id: this.generateMessageId(),
      type: 'user',
      text: message,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    this.newUserMessage = '';
    this.scrollToBottom();

    // Show typing indicator
    this.isTyping = true;

    // Get user ID
    const userId = this.authService.currentUser?.id || null;

    // Get AI response
    this.chatService.chat(message, this.analytics, userId).subscribe({
      next: (response: ChatResponse) => {
        this.isTyping = false;
        const aiMessage: Message = {
          id: this.generateMessageId(),
          type: 'ai',
          text: response.message,
          timestamp: new Date()
        };
        this.messages.push(aiMessage);
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isTyping = false;
        const errorMessage: Message = {
          id: this.generateMessageId(),
          type: 'system',
          text: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.scrollToBottom();
        console.error('Chat error:', error);
      }
    });
  }

  sendSuggestion(suggestion: string): void {
    this.newUserMessage = suggestion;
    this.sendMessage();
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 50);
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getInitialSuggestions(): string[] {
    if (!this.analytics) return [];
    return [
      'How much revenue this month?',
      'Compare with last month',
      'What\'s the growth trend?',
      'Recommend improvements'
    ];
  }
}