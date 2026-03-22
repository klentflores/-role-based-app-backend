const API_BASE = 'http://localhost:3000';

let currentUser          = null;
let editingDeptIndex     = null;
let editingAccountIndex  = null;
let editingEmployeeIndex = null;

window.db = { departments: [], employees: [], requests: [] };

function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const routes = {
    '#/':             'home-page',
    '#/login':        'login-page',
    '#/register':     'register-page',
    '#/verify-email': 'verify-email-page',
    '#/profile':      'profile-page',
    '#/employees':    'employees-page',
    '#/accounts':     'accounts-page',
    '#/departments':  'departments-page',
    '#/requests':     'requests-page'
};

function handleRoute() {
    const hash = window.location.hash || '#/';

    const adminRoutes = ['#/employees', '#/accounts', '#/departments'];
    if (adminRoutes.includes(hash) && (!currentUser || currentUser.role !== 'Admin')) {
        window.location.hash = '#/profile';
        return;
    }

    const targetId = routes[hash] || 'home-page';
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(targetId);
    if (targetPage) targetPage.classList.add('active');

    if (hash === '#/profile') renderProfile();
}

function setAuthState(isAuthenticated, user = null) {
    const body         = document.body;
    const navRoleLabel = document.getElementById('navRoleLabel');
    currentUser        = isAuthenticated ? user : null;

    if (isAuthenticated && user) {
        body.classList.replace('not-authenticated', 'authenticated');

        if (navRoleLabel) {
            navRoleLabel.innerText = user.role;
        }

        if (user.role === 'Admin') {
            body.classList.add('is-admin');
        } else {
            body.classList.remove('is-admin');
        }

    } else {
        body.classList.replace('authenticated', 'not-authenticated');
        body.classList.remove('is-admin');

        sessionStorage.removeItem('authToken');
        currentUser = null;
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPass').value;

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('authToken', data.token);

            const user = {
                username:  data.user.username,
                firstName: data.user.username,
                lastName:  '',
                email:     data.user.username,
                role: data.user.role === 'admin' ? 'Admin' : 'User'
            };

            setAuthState(true, user);
            window.location.hash = '#/profile';
        } else {
            alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }

    } catch (err) {
        alert('Network error – make sure the backend is running on port 3000.');
        console.error(err);
    }
});

document.getElementById('cancelLogin').addEventListener('click', () => {
    if (confirm('Cancel login and Return to home?')) {
        document.getElementById('loginForm').reset();
        window.location.hash = '#/';
        document.getElementById('loginAlert').classList.add('d-none');
    }
});

document.getElementById('simulateVerifyBtn').addEventListener('click', () => {
    const email = sessionStorage.getItem('unverified_email');
    if (email) {
        alert('Email Verified! Please Login.');
        sessionStorage.removeItem('unverified_email');
        document.getElementById('loginAlert').classList.remove('d-none');
        window.location.hash = '#/login';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPass').value;

    if (password.length < 6) {
        alert('Your password is too short. Use at least 6 characters.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password, role: 'user' })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('unverified_email', username);
            document.getElementById('verifyEmailText').innerText = username;
            window.location.hash = '#/verify-email';
        } else {
            alert('Registration failed: ' + (data.error || 'Unknown error'));
        }

    } catch (err) {
        alert('Network error – make sure the backend is running on port 3000.');
        console.error(err);
    }
});

document.getElementById('cancelRegister').addEventListener('click', () => {
    alert('Register Cancelled.');
    document.getElementById('registerForm').reset();
    window.location.hash = '#/login';
});

async function renderProfile() {
    if (!currentUser) return;

    document.getElementById('profileName').innerText  =
        `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.username;
    document.getElementById('displayEmail').innerText = currentUser.email  || currentUser.username;
    document.getElementById('displayRole').innerText  = currentUser.role   || '-';

    try {
        const res = await fetch(`${API_BASE}/api/profile`, {
            headers: getAuthHeader()
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById('displayRole').innerText =
                data.user.role === 'admin' ? 'Admin' : 'User';
        }
    } catch (err) {
        console.warn('Could not fetch profile from server:', err);
    }
}

async function loadAdminDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: getAuthHeader()      // ✅ PDF Part 3 Step 2 – auth header
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Admin dashboard:', data.message);
        } else {
            console.warn('Access denied to admin dashboard.');
        }
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
    }
}

function renderEmployeesTable() {
    const tableBody = document.querySelector('#employees-page tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const employees = window.db.employees || [];

    if (employees.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="py-3 text-muted">No employees found.</td></tr>`;
        return;
    }

    employees.forEach((emp, index) => {
        const row = `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.email}</td>
                <td>${emp.position}</td>
                <td>${emp.dept}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee(${index})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger"       onclick="deleteEmployee(${index})">Delete</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

window.showEmployeeForm = function () {
    editingEmployeeIndex = null;
    const form = document.getElementById('employeeForm');
    form.reset();
    form.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
    document.getElementById('empId').focus();
};

window.editEmployee = function (index) {
    if (confirm('Edit this employee record?')) {
        const emp = window.db.employees[index];
        document.getElementById('empId').value       = emp.id;
        document.getElementById('empEmail').value    = emp.email;
        document.getElementById('empPosition').value = emp.position;
        document.getElementById('empDept').value     = emp.dept;
        document.getElementById('empHireDate').value = emp.hireDate;
        document.getElementById('employeeForm')
            .querySelectorAll('input, select, button')
            .forEach(el => el.disabled = false);
    }
};

window.deleteEmployee = function (index) {
    if (confirm('Are you sure you want to delete this employee?')) {
        window.db.employees.splice(index, 1);
        renderEmployeesTable();
    }
};

window.saveEmployee = function () {
    const empData = {
        id:       document.getElementById('empId').value,
        email:    document.getElementById('empEmail').value,
        position: document.getElementById('empPosition').value,
        dept:     document.getElementById('empDept').value,
        hireDate: document.getElementById('empHireDate').value
    };

    if (!empData.id || !empData.email) {
        alert('Please enter ID and Email.');
        return;
    }

    const existingIndex = window.db.employees.findIndex(e => e.id === empData.id);
    if (existingIndex > -1) {
        window.db.employees[existingIndex] = empData;
    } else {
        window.db.employees.push(empData);
    }

    renderEmployeesTable();
    document.getElementById('employeeForm')
        .querySelectorAll('input, select, button')
        .forEach(el => el.disabled = true);
    alert('Employee saved successfully!');
};

window.resetEmployeeForm = function () {
    const form = document.getElementById('employeeForm');
    form.reset();
    form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
    alert('Cancel complete.');
};

function renderAccounts() {
    const tableBody = document.querySelector('#accounts-page tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const accounts = window.db.accounts || [];

    accounts.forEach((acc, index) => {
        const isCurrentAdmin = currentUser && acc.email === currentUser.email;

        const actionButtons = isCurrentAdmin
            ? `<span class="text-muted fst-italic small">Protected</span>`
            : `
                <button class="btn btn-sm btn-outline-primary" onclick="editAccount(${index})">Edit</button>
                <button class="btn btn-sm btn-outline-warning" onclick="resetPassword(${index})">Reset</button>
                <button class="btn btn-sm btn-outline-danger"  onclick="deleteAccount(${index})">Delete</button>
              `;

        const row = `
            <tr>
                <td>${acc.firstName} ${acc.lastName}</td>
                <td>${acc.email}</td>
                <td>${acc.role}</td>
                <td>${acc.verified ? '✅' : '❌'}</td>
                <td>${actionButtons}</td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

window.showAccountForm = function () {
    editingAccountIndex = null;
    const form = document.getElementById('accountForm');
    form.reset();
    form.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
};

window.editAccount = function (index) {
    const acc = window.db.accounts[index];
    if (currentUser && acc.email === currentUser.email) return;

    if (confirm(`Edit account for ${acc.firstName}?`)) {
        editingAccountIndex = index;
        document.getElementById('accFirstName').value = acc.firstName;
        document.getElementById('accLastName').value  = acc.lastName;
        document.getElementById('accEmail').value     = acc.email;
        document.getElementById('accRole').value      = acc.role;

        const cb = document.getElementById('accVerified');
        if (cb) cb.checked = acc.verified;

        const form = document.getElementById('accountForm');
        if (form) form.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
    }
};

window.resetPassword = function (index) {
    const acc = window.db.accounts[index];
    if (currentUser && acc.email === currentUser.email) return;

    const newPass = prompt(`Enter new password for ${acc.email}:`, '');
    if (newPass) {
        window.db.accounts[index].password = newPass;
        alert('Password updated successfully.');
    }
};

window.deleteAccount = function (index) {
    const acc = window.db.accounts[index];
    if (currentUser && acc.email === currentUser.email) return;

    if (confirm(`Are you sure you want to delete ${acc.firstName}?`)) {
        window.db.accounts.splice(index, 1);
        renderAccounts();
    }
};

window.saveAccount = function () {
    const firstName = document.getElementById('accFirstName').value.trim();
    const lastName  = document.getElementById('accLastName').value.trim();
    const email     = document.getElementById('accEmail').value.trim();
    const password  = document.getElementById('accPass').value.trim();
    const role      = document.getElementById('accRole').value;
    const verified  = document.getElementById('accVerified').checked;

    if (!firstName || !email) { alert('Please fill in the Name and Email.'); return; }

    const accData = { firstName, lastName, email, password, role, verified };

    if (editingAccountIndex !== null) {
        const oldPass = window.db.accounts[editingAccountIndex].password;
        if (accData.password === '') accData.password = oldPass;
        window.db.accounts[editingAccountIndex] = accData;
        alert('Account updated successfully!');
    } else {
        window.db.accounts.push(accData);
        alert('Account created successfully!');
    }

    renderAccounts();
    window.resetAccountForm();
};

window.resetAccountForm = function () {
    const form = document.getElementById('accountForm');
    if (form) {
        form.reset();
        editingAccountIndex = null;
        form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
    }
};

function renderDepartments() {
    const tableBody = document.getElementById('deptTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!window.db.departments || window.db.departments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="py-3 text-muted text-center">No departments.</td></tr>';
        return;
    }

    window.db.departments.forEach((dept, index) => {
        const row = `
            <tr>
                <td><strong>${dept.name}</strong></td>
                <td>${dept.description}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editDepartment(${index})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger"       onclick="deleteDepartment(${index})">Delete</button>
                </td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

window.showDeptForm = function () {
    editingDeptIndex = null;
    const form = document.getElementById('deptForm');
    form.reset();
    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
};

window.editDepartment = function (index) {
    if (confirm('Edit this department record?')) {
        editingDeptIndex = index;
        const dept = window.db.departments[index];
        document.getElementById('deptName').value = dept.name;
        document.getElementById('deptDesc').value = dept.description;
        document.getElementById('deptForm')
            .querySelectorAll('input, textarea, select, button')
            .forEach(el => el.disabled = false);
        document.getElementById('deptName').focus();
    }
};

window.deleteDepartment = function (index) {
    const dept = window.db.departments[index];
    if (confirm(`Are you sure you want to delete the "${dept.name}" department?`)) {
        window.db.departments.splice(index, 1);
        renderDepartments();
    }
};

window.saveDept = function (e) {
    if (e) e.preventDefault();
    const name = document.getElementById('deptName').value;
    const desc = document.getElementById('deptDesc').value;
    const data = { name: name.trim(), description: desc.trim() };

    if (editingDeptIndex !== null) {
        window.db.departments[editingDeptIndex] = data;
    } else {
        window.db.departments.push(data);
    }

    renderDepartments();
    alert('Department saved successfully!');
    window.cancelDept();
};

window.cancelDept = function () {
    editingDeptIndex = null;
    const form = document.getElementById('deptForm');
    if (form) {
        form.reset();
        form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
    }
};

function renderRequests() {
    const tableBody = document.getElementById('requestTableBody');
    const emptyDiv  = document.getElementById('emptyRequests');
    const container = document.getElementById('requestTableContainer');
    if (!tableBody) return;

    if (!currentUser) {
        emptyDiv.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }

    const myRequests = (window.db.requests || []).filter(
        r => r.employeeEmail === currentUser.email
    );

    if (myRequests.length === 0) {
        emptyDiv.classList.remove('d-none');
        container.classList.add('d-none');
        return;
    }

    emptyDiv.classList.add('d-none');
    container.classList.remove('d-none');

    tableBody.innerHTML = myRequests.map(req => {
        const badgeClass =
            req.status === 'Approved' ? 'bg-success' :
            req.status === 'Rejected' ? 'bg-danger'  : 'bg-warning text-dark';
        return `
            <tr>
                <td>${req.type}</td>
                <td>
                    ${req.items.map(i => `${i.name} (${i.qty})`).slice(0, 2).join(', ')}
                    ${req.items.length > 2 ? '...' : ''}
                </td>
                <td><span class="badge ${badgeClass}">${req.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="viewRequestDetails(${req.id})">View</button>
                </td>
            </tr>`;
    }).join('');
}

function viewRequestDetails(id) {
    const req = window.db.requests.find(r => r.id === id);
    if (!req) return;

    document.getElementById('viewType').textContent   = req.type;
    document.getElementById('viewDate').textContent   = req.date;
    document.getElementById('viewStatus').textContent = req.status;
    document.getElementById('viewItems').innerHTML    = req.items.map(item => `
        <li class="list-group-item d-flex justify-content-between">
            ${item.name}
            <span class="badge bg-primary">${item.qty}</span>
        </li>`).join('');

    new bootstrap.Modal(document.getElementById('viewRequestModal')).show();
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-item-btn')) {
        const row = document.createElement('div');
        row.className = 'input-group mb-2 item-row';
        row.innerHTML = `
            <input type="text"   class="form-control" placeholder="Item name" required>
            <input type="number" class="form-control" value="1" min="1" style="max-width: 70px;">
            <button class="btn btn-outline-danger remove-item-btn" type="button">x</button>`;
        document.getElementById('itemsContainer').appendChild(row);
    }
    if (e.target.classList.contains('remove-item-btn')) {
        e.target.closest('.item-row').remove();
    }
});

document.getElementById('requestForm').onsubmit = function (e) {
    e.preventDefault();

    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const name = row.children[0].value.trim();
        const qty  = parseInt(row.children[1].value);
        if (name) items.push({ name, qty: qty || 1 });
    });

    if (items.length === 0) { alert('Please add at least one item.'); return; }

    const newReq = {
        id:            Date.now(),
        type:          document.getElementById('reqType').value,
        items,
        status:        'Pending',
        date:          new Date().toLocaleDateString(),
        employeeEmail: currentUser ? currentUser.email : ''
    };

    if (!window.db.requests) window.db.requests = [];
    window.db.requests.push(newReq);
    renderRequests();

    const modal = bootstrap.Modal.getInstance(document.getElementById('newRequestModal'));
    if (modal) modal.hide();

    this.reset();
    document.getElementById('itemsContainer').innerHTML = `
        <div class="input-group mb-2 item-row">
            <input type="text"   class="form-control" placeholder="Item name" required>
            <input type="number" class="form-control" value="1" style="max-width: 70px;">
            <button class="btn btn-outline-secondary add-item-btn" type="button">+</button>
        </div>`;
    alert('Request Submitted!');
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    // PDF Extension Ideas: clear sessionStorage on logout
    sessionStorage.removeItem('authToken');
    setAuthState(false);
    window.location.hash = '#/';
});

window.addEventListener('hashchange', handleRoute);

window.addEventListener('load', async () => {
    window.db.requests    = [];
    window.db.employees   = [];
    window.db.departments = [];

    window.db.accounts = [
        { firstName: 'Admin', lastName: 'User', email: 'admin',
          role: 'Admin', verified: true }
    ];

    const token = sessionStorage.getItem('authToken');
    if (token) {
        try {

            const res = await fetch(`${API_BASE}/api/profile`, {
                headers: getAuthHeader()
            });

            if (res.ok) {
                const data = await res.json();
                const user = {
                    username:  data.user.username,
                    firstName: data.user.username,
                    lastName:  '',
                    email:     data.user.username,
                    role:      data.user.role === 'admin' ? 'Admin' : 'User'
                };
                setAuthState(true, user);


                if (user.role === 'Admin') {
                    loadAdminDashboard();
                }
            } else {
                sessionStorage.removeItem('authToken');
            }
        } catch (err) {
            console.warn('Session restore failed:', err);
            sessionStorage.removeItem('authToken');
        }
    }

    handleRoute();
    renderEmployeesTable();
    renderAccounts();
    renderDepartments();
    renderRequests();
});