function initAuth() {
    console.log('Initializing auth...');

    const authForm = document.getElementById('auth-form');
    const toggleAuthBtn = document.getElementById('toggle-auth-btn');
    const submitBtn = document.getElementById('submit-btn');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const confirmPasswordInput = document.getElementById('confirm-password');
    let isLoginMode = true;

    console.log('Elements found:', {
        authForm,
        toggleAuthBtn,
        submitBtn,
        confirmPasswordGroup,
        confirmPasswordInput
    });

    if (!authForm) {
        console.error('Auth form not found. Aborting initialization.');
        return;
    }

    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', function() {
            isLoginMode = !isLoginMode;
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = isLoginMode ? 'none' : 'block';
            if (submitBtn) submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
            toggleAuthBtn.textContent = isLoginMode ? 'Switch to Sign Up' : 'Switch to Login';
            
            if (confirmPasswordInput) confirmPasswordInput.required = !isLoginMode;
        });
    } else {
        console.warn('Toggle auth button not found');
    }

    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;

        if (!username || !password) {
            showMessage('Please enter both username and password', 'danger');
            return;
        }

        if (!isLoginMode) {
            const confirmPassword = confirmPasswordInput?.value;
            if (!confirmPassword) {
                showMessage('Please confirm your password', 'danger');
                return;
            }
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'danger');
                return;
            }
        }

        try {
            if (isLoginMode) {
                await login(username, password);
            } else {
                await signUp(username, password);
            }
        } catch (error) {
            showMessage(error.message, 'danger');
        }
    });

    console.log('Auth initialization complete');
}

function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `alert alert-${type}`;
        messageElement.style.display = 'block';
    } else {
        console.error('Message element not found');
        alert(message);  // Fallback to alert if message element is not found
    }
}

async function login(username, password) {
    try {
        console.log('Attempting login with:', { username, password: '****' });
        console.log('Fetching from URL:', `${CONFIG.API_URL}/login`);

        const response = await fetch(`${CONFIG.API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
            mode: 'cors',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Login failed');
        }

        const responseData = await response.json();
        console.log('Login successful:', responseData);

        localStorage.setItem('authToken', responseData.token);
        localStorage.setItem('userId', responseData.userId);
        
        if (responseData.jobRequirements) {
            console.log('Storing job requirements:', responseData.jobRequirements);
            localStorage.setItem('jobRequirements', JSON.stringify(responseData.jobRequirements));
        } else {
            console.warn('No job requirements received from server');
        }

        // Redirect to the main page
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message, 'danger');
    }
}

async function signUp(username, password) {
    console.log('Sign Up:', username, password);
    // Implement your sign up logic here
    // For example:
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            throw new Error('Sign up failed');
        }
        const data = await response.json();
        // Handle successful sign up (e.g., auto login, redirect)
        console.log('Sign up successful:', data);
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

// Try to initialize immediately
initAuth();

// If that fails, try again when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initAuth);

// If that also fails, try one last time when everything is loaded
window.addEventListener('load', initAuth);
