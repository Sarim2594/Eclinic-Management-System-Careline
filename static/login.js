const API_URL = 'http://localhost:8000/api';

// --- Check for existing session ---
(function checkExistingSession() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            const currentUser = JSON.parse(userData);
            if (currentUser.role) {
                // If logged in, redirect to their home portal
                window.location.replace(`/${currentUser.role}`);
            }
        } catch (e) {
            // Corrupt data, let them log in again
            localStorage.removeItem('currentUser');
        }
    }
})();

async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();

    const username_or_email = document.getElementById('username') ? document.getElementById('username').value : '';
    const password = document.getElementById('password') ? document.getElementById('password').value : '';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store user data in localStorage for other pages
            localStorage.setItem('currentUser', JSON.stringify(data));

            // REDIRECT using the URL provided by the server
            window.location.href = data.redirect_url;
        } else {
            showLoginMessage(data.detail || 'Invalid credentials', 'error');
        }
    } catch (error) {
        showLoginMessage('Login failed: ' + (error.message || error), 'error');
    }
}

function showLoginMessage(message, type) {
    const msgDiv = document.getElementById('login-message');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = `mb-4 p-3 rounded-lg ${type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`;
    msgDiv.classList.remove('hidden');
    setTimeout(() => msgDiv.classList.add('hidden'), 5000);
}