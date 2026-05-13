import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-cancel.component.html',
  styleUrl: './payment-cancel.component.css'
})
export class PaymentCancelComponent {
  constructor(private router: Router) {}

  goToSubscriptions(): void {
    this.router.navigate(['/user/subscription']);
  }

  goToDashboard(): void {
    this.router.navigate(['/user']);
  }
}