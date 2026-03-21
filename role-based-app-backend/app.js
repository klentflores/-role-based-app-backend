// LOGIN
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save token
            sessionStorage.setItem('authToken', data.token);

            alert("Login successful!");

            // Redirect to dashboard
            window.location.href = "dashboard.html";
        } else {
            alert('Login failed: ' + data.error);
        }

    } catch (err) {
        alert('Network error');
    }
}

// AUTH HEADER
function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// LOAD ADMIN DASHBOARD
async function loadAdminDashboard() {
    const res = await fetch('http://localhost:3000/api/admin/dashboard', {
        headers: getAuthHeader()
    });

    const data = await res.json();

    if (res.ok) {
        document.getElementById('content').innerText = data.message;
    } else {
        document.getElementById('content').innerText = data.error || 'Access denied!';
    }
}

// LOAD USER PROFILE
async function loadProfile() {
    const res = await fetch('http://localhost:3000/api/profile', {
        headers: getAuthHeader()
    });

    const data = await res.json();

    if (res.ok) {
        document.getElementById('content').innerText = `Welcome ${data.user.username} (${data.user.role})`;
    }
}

async function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Registration successful!");
            window.location.href = "login.html";
        } else {
            alert("Error: " + data.error);
        }

    } catch (err) {
        alert("Network error");
    }
}

// LOGOUT
function logout() {
    sessionStorage.removeItem('authToken');
    window.location.href = "login.html";
}