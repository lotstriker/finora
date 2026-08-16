// ============================================
// FINORA — People
// ============================================

async function loadPeople() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const people = await db.readAll('people');
    
    const html = `
        <div class="people-page">
            <div class="page-header">
                <h2>People</h2>
                <button class="btn btn-primary" onclick="openAddPersonModal()">
                    <i class="fas fa-plus"></i> Add Person
                </button>
            </div>
            
            <div class="people-grid">
                ${people.length > 0 ? people.map(p => `
                    <div class="person-card card" onclick="viewPersonDetails('${p.id}')">
                        <div class="person-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="person-info">
                            <h3>${p.name}</h3>
                            ${p.phone ? `<span class="person-phone">${p.phone}</span>` : ''}
                            ${p.email ? `<span class="person-email">${p.email}</span>` : ''}
                        </div>
                        <div class="person-actions">
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();viewPersonDetails('${p.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deletePerson('${p.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state" style="grid-column:1/-1">
                        <i class="fas fa-users"></i>
                        <p>No people added yet</p>
                        <button class="btn btn-primary" onclick="openAddPersonModal()">Add Person</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    const style = document.createElement('style');
    style.textContent = `
        .people-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
        }
        .person-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 20px;
            cursor: pointer;
            transition: all var(--transition);
        }
        .person-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .person-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--primary-light);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: var(--primary);
            flex-shrink: 0;
        }
        .person-info {
            flex: 1;
        }
        .person-info h3 {
            font-size: 1rem;
            font-weight: 600;
        }
        .person-phone, .person-email {
            font-size: 0.75rem;
            color: var(--text-muted);
            display: block;
        }
        .person-actions {
            display: flex;
            gap: 6px;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddPersonModal() {
    openModal('Add Person', `
        <form id="personForm">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" class="form-control" id="personName" placeholder="Full name" required />
            </div>
            <div class="form-group">
                <label>Phone (Optional)</label>
                <input type="text" class="form-control" id="personPhone" placeholder="Phone number" />
            </div>
            <div class="form-group">
                <label>Email (Optional)</label>
                <input type="email" class="form-control" id="personEmail" placeholder="Email address" />
            </div>
            <div class="form-group">
                <label>Notes (Optional)</label>
                <textarea class="form-control" id="personNotes" rows="2" placeholder="Any notes about this person"></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Person</button>
        </form>
    `);
    
    document.getElementById('personForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddPerson();
    });
}

async function handleAddPerson() {
    const name = document.getElementById('personName').value.trim();
    const phone = document.getElementById('personPhone').value.trim();
    const email = document.getElementById('personEmail').value.trim();
    const notes = document.getElementById('personNotes').value.trim();
    
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }
    
    try {
        const db = getDB();
        await db.create('people', {
            id: `PERSON-${Date.now()}`,
            name,
            phone: phone || null,
            email: email || null,
            notes: notes || null,
            createdAt: new Date().toISOString()
        });
        
        closeModal();
        showToast('Person added successfully!', 'success');
        await loadPeople();
    } catch (error) {
        showToast('Failed to add person: ' + error.message, 'error');
    }
}

async function viewPersonDetails(personId) {
    const db = getDB();
    const person = await db.read('people', personId);
    if (!person) {
        showToast('Person not found', 'error');
        return;
    }
    
    const transactions = await getLedgerEntries({ personId });
    const totalRelated = transactions.reduce((s, t) => s + t.amount, 0);
    
    openModal(`Person: ${person.name}`, `
        <div class="person-detail">
            <div class="person-detail-info">
                ${person.phone ? `<div><span>Phone</span> ${person.phone}</div>` : ''}
                ${person.email ? `<div><span>Email</span> ${person.email}</div>` : ''}
                ${person.notes ? `<div><span>Notes</span> ${person.notes}</div>` : ''}
                <div><span>Total Related</span> <strong>${formatCurrency(totalRelated)}</strong></div>
                <div><span>Transactions</span> ${transactions.length}</div>
            </div>
            <hr />
            <h4>Related Transactions</h4>
            <div class="person-txns">
                ${transactions.length > 0 ? transactions.slice(0, 10).map(t => `
                    <div class="txn-item-small">
                        <span>${t.description || t.type}</span>
                        <span class="${t.direction === 'in' ? 'text-success' : 'text-danger'}">
                            ${t.direction === 'in' ? '+' : '-'} ${formatCurrency(t.amount)}
                        </span>
                    </div>
                `).join('') : '<span class="text-muted">No related transactions</span>'}
            </div>
        </div>
    `);
}

async function deletePerson(personId) {
    confirmAction('Delete this person? Existing transactions will remain but person reference will be removed.', async () => {
        try {
            const db = getDB();
            await db.delete('people', personId);
            showToast('Person deleted', 'warning');
            await loadPeople();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    });
}