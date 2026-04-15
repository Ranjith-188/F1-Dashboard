// --- STATE ---
let currentView = 'dashboard';
let editingId = null;
let currentData = {
    drivers: [],
    teams: [],
    races: [],
    results: []
};

// --- DATA FETCHING ---
const API = {
    get: (url) => fetch(url).then(res => res.json()),
    post: (url, data) => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()),
    put: (url, data) => fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()),
    delete: (url) => fetch(url, { method: 'DELETE' }).then(res => res.json())
};

// --- ROUTING ---
async function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`${view}-view`).style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === view);
    });

    const addBtn = document.getElementById('add-btn');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    if (view === 'dashboard') {
        addBtn.style.display = 'none';
        pageTitle.innerText = 'Dashboard';
        pageSubtitle.innerText = 'Formula 1 Season Overview';
        await loadDashboard();
    } else {
        addBtn.style.display = 'flex';
        const labels = {
            drivers: { title: 'Drivers', sub: 'Manage Formula 1 drivers', btn: 'Add Driver' },
            teams: { title: 'Teams', sub: 'Manage constructors & teams', btn: 'Add Team' },
            races: { title: 'Race Calendar', sub: 'Season schedule & circuits', btn: 'Add Race' },
            results: { title: 'Results & Standings', sub: 'Race results and championship standings', btn: 'Add Result' },
            database: { title: 'Database Explorer', sub: 'Direct SQL table viewer', btn: '' }
        };
        pageTitle.innerText = labels[view].title;
        pageSubtitle.innerText = labels[view].sub;
        
        if (view === 'database') {
            addBtn.style.display = 'none';
            await loadDatabaseTables();
        } else {
            addBtn.style.display = 'flex';
            document.getElementById('add-btn-text').innerText = labels[view].btn;
            await loadViewData(view);
        }
    }
}

// --- VIEW LOADERS ---
async function loadDashboard() {
    const stats = await API.get('/api/stats');
    document.getElementById('stat-drivers').innerText = stats.totalDrivers;
    document.getElementById('stat-teams').innerText = stats.totalTeams;
    document.getElementById('stat-races').innerText = stats.totalRaces;
    document.getElementById('stat-results').innerText = stats.totalResults;

    const results = await API.get('/api/results');
    const tbody = document.querySelector('#recent-results-table tbody');
    tbody.innerHTML = results.slice(0, 5).map(r => `
        <tr>
            <td>${r.circuit_name}</td>
            <td>${r.driver_name}</td>
            <td>${r.team_name}</td>
            <td><span class="points-text">${r.points_scored}</span></td>
        </tr>
    `).join('');
}

async function loadViewData(view) {
    const data = await API.get(`/api/${view}`);
    currentData[view] = data;

    if (view === 'drivers') {
        const teams = await API.get('/api/teams');
        currentData.teams = teams;
        renderDrivers(data);
    } else if (view === 'teams') {
        renderTeams(data);
    } else if (view === 'races') {
        renderRaces(data);
    } else if (view === 'results') {
        const [drivers, teams, races, standings] = await Promise.all([
            API.get('/api/drivers'),
            API.get('/api/teams'),
            API.get('/api/races'),
            API.get('/api/standings')
        ]);
        currentData.drivers = drivers;
        currentData.teams = teams;
        currentData.races = races;
        renderResults(data);
        renderStandings(standings);
    }
    lucide.createIcons();
}

// --- DATABASE EXPLORER LOADERS ---
async function loadDatabaseTables() {
    const tables = await API.get('/api/db/tables');
    const select = document.getElementById('db-table-select');
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">Select a table...</option>' + 
        tables.map(t => `<option value="${t}" ${t === currentVal ? 'selected' : ''}>${t}</option>`).join('');
}

async function loadTableData(tableName) {
    if (!tableName) {
        document.getElementById('db-explorer-thead').innerHTML = '';
        document.getElementById('db-explorer-tbody').innerHTML = '';
        document.getElementById('db-row-count').innerText = '0';
        return;
    }

    const data = await API.get(`/api/db/table/${tableName}`);
    renderExplorerTable(data);
}

// --- RENDERING ---
function renderExplorerTable(data) {
    const thead = document.getElementById('db-explorer-thead');
    const tbody = document.getElementById('db-explorer-tbody');
    const rowCount = document.getElementById('db-row-count');

    rowCount.innerText = data.length;

    if (data.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding:2rem; color:var(--text-secondary)">No data available in this table</td></tr>';
        return;
    }

    // Generate Headers
    const columns = Object.keys(data[0]);
    thead.innerHTML = columns.map(col => `<th>${col.toUpperCase()}</th>`).join('');

    // Generate Rows
    tbody.innerHTML = data.map(row => `
        <tr>
            ${columns.map(col => {
                const val = row[col];
                const isId = col === 'id' || col.endsWith('_id');
                const isPoints = col.includes('points');
                
                let displayVal = val;
                if (val === null) displayVal = '<em style="color:var(--text-secondary)">null</em>';
                else if (typeof val === 'boolean') displayVal = val ? 'Yes' : 'No';
                
                return `<td>${isId ? `<strong>${val}</strong>` : (isPoints ? `<span class="points-text">${val}</span>` : displayVal)}</td>`;
            }).join('')}
        </tr>
    `).join('');
}
function renderDrivers(drivers) {
    const tbody = document.querySelector('#drivers-table tbody');
    tbody.innerHTML = drivers.map((d, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${d.full_name}</strong></td>
            <td>${d.nationality}</td>
            <td>${d.car_number}</td>
            <td>${d.team_name || 'Free Agent'}</td>
            <td><span class="points-text">${d.total_points}</span></td>
            <td>
                <button class="icon-btn edit-btn" onclick="openModal('drivers', ${d.id})"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteItem('drivers', ${d.id}, '${d.full_name}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderTeams(teams) {
    const tbody = document.querySelector('#teams-table tbody');
    tbody.innerHTML = teams.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${t.team_name}</strong></td>
            <td>${t.principal}</td>
            <td>${t.engine_supplier}</td>
            <td>${t.nationality}</td>
            <td><span class="points-text">${t.total_points}</span></td>
            <td>
                <button class="icon-btn edit-btn" onclick="openModal('teams', ${t.id})"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteItem('teams', ${t.id}, '${t.team_name}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderRaces(races) {
    const tbody = document.querySelector('#races-table tbody');
    tbody.innerHTML = races.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>R${r.round_number}</strong></td>
            <td>${r.circuit_name}</td>
            <td>${r.country}</td>
            <td>${r.race_date}</td>
            <td><span class="status-badge status-${r.status}">${r.status}</span></td>
            <td>
                <button class="icon-btn edit-btn" onclick="openModal('races', ${r.id})"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteItem('races', ${r.id}, '${r.circuit_name}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderResults(results) {
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = results.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${r.circuit_name}</td>
            <td><strong>${r.driver_name}</strong></td>
            <td>${r.team_name}</td>
            <td>P${r.finishing_position}</td>
            <td><span class="points-text">${r.points_scored}</span></td>
            <td>${r.fastest_lap ? '⚡ Yes' : 'No'}</td>
            <td>
                <button class="icon-btn edit-btn" onclick="openModal('results', ${r.id})"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteItem('results', ${r.id}, '${r.driver_name} at ${r.circuit_name}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderStandings(standings) {
    const tbody = document.querySelector('#standings-table tbody');
    tbody.innerHTML = standings.map((s, i) => `
        <tr>
            <td><strong>${i + 1}</strong></td>
            <td>${s.full_name}</td>
            <td>${s.team_name}</td>
            <td><span class="points-text">${s.points}</span></td>
        </tr>
    `).join('');
}

// --- MODAL & FORMS ---
function openModal(type, id = null) {
    editingId = id;
    const modal = document.getElementById('modal-overlay');
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    const saveBtn = document.getElementById('save-btn');

    modalTitle.innerText = id ? `Edit ${type.slice(0, -1)}` : `Add ${type.slice(0, -1)}`;
    saveBtn.innerText = id ? 'Save Changes' : `Add ${type.slice(0, -1)}`;

    const item = id ? currentData[type].find(x => x.id === id) : {};

    let fieldsHTML = '';
    if (type === 'drivers') {
        fieldsHTML = `
            <div class="form-group full-width"><label>Full Name</label><input name="full_name" value="${item.full_name || ''}" required></div>
            <div class="form-group"><label>Nationality</label><input name="nationality" value="${item.nationality || ''}"></div>
            <div class="form-group"><label>Car Number</label><input type="number" name="car_number" value="${item.car_number || ''}"></div>
            <div class="form-group"><label>Team</label>
                <select name="team_id">
                    <option value="">Select team</option>
                    ${currentData.teams.map(t => `<option value="${t.id}" ${item.team_id == t.id ? 'selected' : ''}>${t.team_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Total Points</label><input type="number" name="total_points" value="${item.total_points || 0}"></div>
            <div class="form-group"><label>Date of Birth</label><input type="date" name="date_of_birth" value="${item.date_of_birth || ''}"></div>
        `;
    } else if (type === 'teams') {
        fieldsHTML = `
            <div class="form-group full-width"><label>Team Name</label><input name="team_name" value="${item.team_name || ''}" required></div>
            <div class="form-group"><label>Principal</label><input name="principal" value="${item.principal || ''}"></div>
            <div class="form-group"><label>Engine Supplier</label><input name="engine_supplier" value="${item.engine_supplier || ''}"></div>
            <div class="form-group"><label>Nationality</label><input name="nationality" value="${item.nationality || ''}"></div>
            <div class="form-group"><label>Total Points</label><input type="number" name="total_points" value="${item.total_points || 0}"></div>
        `;
    } else if (type === 'races') {
        fieldsHTML = `
            <div class="form-group"><label>Round Number</label><input type="number" name="round_number" value="${item.round_number || ''}" required></div>
            <div class="form-group"><label>Status</label>
                <select name="status">
                    <option value="upcoming" ${item.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="form-group full-width"><label>Circuit Name</label><input name="circuit_name" value="${item.circuit_name || ''}" required></div>
            <div class="form-group"><label>Country</label><input name="country" value="${item.country || ''}"></div>
            <div class="form-group"><label>Race Date</label><input type="date" name="race_date" value="${item.race_date || ''}"></div>
        `;
    } else if (type === 'results') {
        fieldsHTML = `
            <div class="form-group full-width"><label>Race</label>
                <select name="race_id" required>
                    <option value="">Select race</option>
                    ${currentData.races.map(r => `<option value="${r.id}" ${item.race_id == r.id ? 'selected' : ''}>${r.circuit_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Driver</label>
                <select name="driver_id" required>
                    <option value="">Select driver</option>
                    ${currentData.drivers.map(d => `<option value="${d.id}" ${item.driver_id == d.id ? 'selected' : ''}>${d.full_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Team</label>
                <select name="team_id" required>
                    <option value="">Select team</option>
                    ${currentData.teams.map(t => `<option value="${t.id}" ${item.team_id == t.id ? 'selected' : ''}>${t.team_name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Finishing Position</label><input type="number" name="finishing_position" value="${item.finishing_position || ''}" required></div>
            <div class="form-group"><label>Points Scored</label><input type="number" name="points_scored" value="${item.points_scored || 0}"></div>
            <div class="form-group"><label style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" name="fastest_lap" ${item.fastest_lap ? 'checked' : ''} style="width:auto"> Fastest Lap
            </label></div>
        `;
    }

    formFields.innerHTML = fieldsHTML;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    editingId = null;
}

function closeDeleteModal() {
    document.getElementById('delete-modal-overlay').style.display = 'none';
}

let deleteResolver = null;

async function deleteItem(type, id, displayName) {
    const modal = document.getElementById('delete-modal-overlay');
    const nameSpan = document.getElementById('delete-item-name');
    nameSpan.innerText = displayName;
    modal.style.display = 'flex';

    const result = await new Promise((resolve) => {
        deleteResolver = resolve;
    });

    closeDeleteModal();

    if (result) {
        await API.delete(`/api/${type}/${id}`);
        showToast(`${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)} deleted!`);
        loadViewData(type);
    }
}

// --- INITIALIZATION & EVENTS ---
document.addEventListener('DOMContentLoaded', () => {
    switchView('dashboard');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.page);
        });
    });

    document.getElementById('add-btn').addEventListener('click', () => {
        openModal(currentView);
    });

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // Delete Modal Events
    document.getElementById('close-delete-modal').addEventListener('click', () => deleteResolver(false));
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => deleteResolver(false));
    document.getElementById('confirm-delete-btn').addEventListener('click', () => deleteResolver(true));

    document.getElementById('db-table-select').addEventListener('change', (e) => {
        loadTableData(e.target.value);
    });

    document.getElementById('dynamic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Handle checkbox
        if (currentView === 'results') {
            data.fastest_lap = formData.get('fastest_lap') === 'on';
        }

        try {
            if (editingId) {
                await API.put(`/api/${currentView}/${editingId}`, data);
                showToast('Changes saved successfully!');
            } else {
                await API.post(`/api/${currentView}`, data);
                showToast('Item added successfully!');
            }
            closeModal();
            loadViewData(currentView);
        } catch (err) {
            showToast('Error saving item!', true);
        }
    });
});

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    msg.innerText = message;
    toast.style.background = isError ? 'rgba(225, 6, 0, 0.4)' : 'rgba(40, 167, 69, 0.4)';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
