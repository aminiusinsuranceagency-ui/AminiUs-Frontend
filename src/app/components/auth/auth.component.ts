import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { UtilityService } from '../../services/utility.service';
import { SessionService } from '../../services/session.service';
import { 
  RegisterRequest, 
  LoginRequest, 
  AgentProfile 
} from '../../interfaces/Agent';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('pulse', [
      state('active', style({ transform: 'scale(1)' })),
      transition('* => active', [
        animate('2000ms ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('2000ms ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ]),
    trigger('expandCollapse', [
      transition(':enter', [
        style({ opacity: 0, maxHeight: '0px', transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, maxHeight: '500px', transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, maxHeight: '0px', transform: 'translateY(-10px)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ]),
    trigger('messageSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-50px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-30px)' }))
      ])
    ])
  ]
})
export class AuthComponent implements OnInit {
  authForm: FormGroup;
  isFirstTime: boolean = true;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;
  showMessage: boolean = false;
  messageText: string = '';
  messageType: 'success' | 'error' | 'welcome' = 'success';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private agentService: AgentService,
    private utilityService: UtilityService,
    private sessionService: SessionService
  ) {
    this.authForm = this.createForm();
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.checkExistingSession();
    
    // Check if user has registered before
    this.checkUserRegistrationStatus();
    
    // Initialize form based on mode
    this.updateFormValidation();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      firstName: [''],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [''],
      rememberMe: [false]
    });
  }

  private checkExistingSession(): void {
    if (this.sessionService.isAuthenticated()) {
      console.log('Existing session found, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }
  }

  private checkUserRegistrationStatus(): void {
    // Check if user has registered before
    const hasRegistered = localStorage.getItem('aminusUserRegistered');
    this.isFirstTime = !hasRegistered;
    this.updateFormValidation();
  }

  private updateFormValidation(): void {
    const firstNameControl = this.authForm.get('firstName');
    const lastNameControl = this.authForm.get('lastName');
    const phoneControl = this.authForm.get('phone');
    const confirmPasswordControl = this.authForm.get('confirmPassword');

    if (this.isFirstTime) {
      // Registration mode - add validation to all fields
      firstNameControl?.setValidators([Validators.required]);
      lastNameControl?.setValidators([Validators.required]);
      phoneControl?.setValidators([Validators.required]);
      confirmPasswordControl?.setValidators([Validators.required, this.passwordMatchValidator.bind(this)]);
    } else {
      // Login mode - only email and password required
      firstNameControl?.clearValidators();
      lastNameControl?.clearValidators();
      phoneControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
    }

    // Update validity for all controls
    Object.keys(this.authForm.controls).forEach(key => {
      this.authForm.get(key)?.updateValueAndValidity();
    });
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
    const password = this.authForm?.get('password')?.value;
    const confirmPassword = control.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      return { 'passwordMismatch': true };
    }
    
    return null;
  }

  toggleMode(): void {
    this.isFirstTime = !this.isFirstTime;
    this.resetForm();
    this.updateFormValidation();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.authForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  hasPasswordMismatch(): boolean {
    const confirmPasswordControl = this.authForm.get('confirmPassword');
    return !!(confirmPasswordControl && 
             confirmPasswordControl.errors?.['passwordMismatch'] && 
             (confirmPasswordControl.dirty || confirmPasswordControl.touched));
  }

  async onSubmit(): Promise<void> {
    console.log('Form submit triggered', {
      isValid: this.authForm.valid,
      formValue: this.authForm.value,
      isFirstTime: this.isFirstTime,
      isLoading: this.isLoading
    });

    if (this.authForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      try {
        if (this.isFirstTime) {
          await this.handleRegistration();
        } else {
          await this.handleLogin();
        }
      } catch (error) {
        console.error('Authentication error:', error);
        this.showErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        this.isLoading = false;
      }
    } else {
      console.log('Form validation failed', {
        errors: this.getFormValidationErrors()
      });
      this.markFormGroupTouched();
    }
  }

 private async handleRegistration(): Promise<void> {
  const formData = this.authForm.value;
  console.log('Starting registration process', { email: formData.email });

  // Simple client-side validation (optional since Angular validator already handles it)
  const email = formData.email.trim().toLowerCase();
  if (!email || !this.isValidEmail(email)) {
    this.showErrorMessage('Please enter a valid email address.');
    return;
  }


  // Format phone number if utility service is available
  let formattedPhone = formData.phone;
  if (this.utilityService) {
    try {
      const phoneFormatResult = await this.utilityService.formatPhoneNumber(formData.phone, 'KE');
      formattedPhone = phoneFormatResult?.FormattedPhoneNumber || formData.phone;
    } catch (phoneError) {
      console.warn('Phone formatting service unavailable, using original phone number', phoneError);
    }
  }

  // Hash the password
   const passwordHash = await this.hashPassword(formData.password);

  const registerRequest: RegisterRequest = {
    FirstName: formData.firstName.trim(),
    LastName: formData.lastName.trim(),
    Email: email,
    Phone: formData.phone.trim(),
    PasswordHash: passwordHash,
    Avatar: ''
  };



  console.log('Sending registration request', registerRequest);
 try {
    const response = await this.agentService.registerAgent(registerRequest).toPromise();
    console.log('Registration response:', response);

    if (response?.Success && response.AgentId) {
      localStorage.setItem('aminusUserRegistered', 'true');
      this.showWelcomeMessage(`Welcome to Aminius, ${formData.firstName}! Your account has been created successfully.`);

      setTimeout(() => {
        this.isFirstTime = false;
        this.resetForm();
        this.authForm.patchValue({ email: formData.email });
        this.updateFormValidation();
      }, 2500);
    } else {
      this.showErrorMessage(response?.Message || 'Registration failed. Please try again.');
    }
  } catch (registrationError: any) {
    console.error('Registration request failed:', registrationError);
    this.showErrorMessage(registrationError?.error?.Message || 'Registration failed. Please try again.');
  }
}
private isValidEmail(email: string): boolean {
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailPattern.test(email) && email.length <= 100;
}
  private async handleLogin(): Promise<void> {
  const formData = this.authForm.value;
  console.log('Starting login process', { email: formData.email });
  
  try {
    const passwordHash = await this.hashPassword(formData.password);

    const loginRequest: LoginRequest = {
      Email: formData.email.trim().toLowerCase(),
      Password: passwordHash
    };

    console.log('Sending login request', { email: loginRequest.Email });

    const response = await this.agentService.loginAgent(loginRequest).toPromise();
    console.log('Login response:', response);

    if (response?.Success && response.AgentId && response.AgentProfile) {
      try {
        let agentProfile: AgentProfile;

        if (typeof response.AgentProfile === 'string') {
          agentProfile = JSON.parse(response.AgentProfile) as AgentProfile;
        } else {
          agentProfile = response.AgentProfile as AgentProfile;
        }

        // Create session data
        const sessionData = {
          user: agentProfile,
          token: response.Token || '',
          loginTime: new Date().toISOString(),
          rememberMe: formData.rememberMe,
          agentId: response.AgentId
        };
        
        // Store session
        this.sessionService.setSession(sessionData);
        console.log('Session created successfully');
        
        this.showWelcomeMessage(`Welcome back, ${agentProfile.FirstName}! Welcome back to your dashboard.`);
        
        // Navigate to dashboard after showing welcome message
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
        
      } catch (parseError) {
        console.error('Error parsing agent profile:', parseError);
        this.showErrorMessage('Login successful but profile data is invalid. Please contact support.');
      }
      
    } else {
      const errorMessage = response?.Message || 'Invalid email or password. Please try again.';
      console.error('Login failed:', errorMessage);
      this.showErrorMessage(errorMessage);
    }
  } catch (error: any) {
    console.error('Login error:', error);
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.error?.Message) {
      errorMessage = error.error.Message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.status === 401) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.status === 404) {
      errorMessage = 'Account not found. Please check your email or create a new account.';
    }
    
    this.showErrorMessage(errorMessage);
  }
}

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production, use proper password hashing
    // Note: The backend should handle proper password hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.authForm.controls).forEach(key => {
      const control = this.authForm.get(key);
      control?.markAsTouched();
    });
  }

  private resetForm(): void {
    this.authForm.reset();
    this.showPassword = false;
    this.showConfirmPassword = false;
    
    // Reset to default values
    this.authForm.patchValue({
      email: '',
      rememberMe: false
    });
  }

  private showSuccessMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'success';
    this.showMessage = true;
    
    setTimeout(() => {
      this.showMessage = false;
    }, 3000);
  }

  private showWelcomeMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'welcome';
    this.showMessage = true;
    
    setTimeout(() => {
      this.showMessage = false;
    }, 3500);
  }

  private showErrorMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'error';
    this.showMessage = true;
    
    setTimeout(() => {
      this.showMessage = false;
    }, 4000);
  }

  async onForgotPassword(): Promise<void> {
    const email = this.authForm.get('email')?.value;
    
    if (!email || !email.trim()) {
      this.showErrorMessage('Please enter your email address first.');
      return;
    }

    if (this.authForm.get('email')?.invalid) {
      this.showErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      console.log('Requesting password reset for:', email);
      const response = await this.agentService.requestPasswordReset({ Email: email.trim().toLowerCase() }).toPromise();
      console.log('Password reset response:', response);
      
      if (response?.Success) {
        this.showSuccessMessage('Password reset instructions have been sent to your email.');
      } else {
        this.showErrorMessage(response?.Message || 'Failed to send password reset email.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error.error?.Message) {
        errorMessage = error.error.Message;
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check your connection.';
      } else if (error.status === 404) {
        errorMessage = 'No account found with this email address.';
      }
      
      this.showErrorMessage(errorMessage);
    }
  }

  // Development utility methods
  debugAuth(): void {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Form Valid:', this.authForm.valid);
    console.log('Form Value:', this.authForm.value);
    console.log('Form Errors:', this.getFormValidationErrors());
    console.log('Is First Time:', this.isFirstTime);
    console.log('Is Loading:', this.isLoading);
    console.log('Current Session:', this.sessionService.getCurrentUser());
    console.log('Is Authenticated:', this.sessionService.isAuthenticated());
    console.log('========================');
  }

  clearAllData(): void {
    localStorage.removeItem('aminusUserRegistered');
    this.sessionService.clearSession();
    this.isFirstTime = true;
    this.resetForm();
    this.updateFormValidation();
    this.showSuccessMessage('All data cleared. You can register again.');
    console.log('All authentication data cleared');
  }

  private getFormValidationErrors(): any {
    let formErrors: any = {};

    Object.keys(this.authForm.controls).forEach(key => {
      const controlErrors = this.authForm.get(key)?.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }
    });

    return formErrors;
  }

  // Getter methods for template
  get isFormValid(): boolean {
    return this.authForm.valid;
  }

  get canSubmit(): boolean {
    return this.authForm.valid && !this.isLoading;
  }
}