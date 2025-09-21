// --- script.js (versión corregida con solución al problema de pantalla en blanco) ---

// Configuración de Firebase (mantén tus claves existentes)
const firebaseConfig = {
  apiKey: "AIzaSyBLJWA3tkQUGqwJad75XQp7VV4t5oiK-dk",
  authDomain: "spent-original.firebaseapp.com",
  projectId: "spent-original",
  storageBucket: "spent-original.firebasestorage.app",
  messagingSenderId: "495334490672",
  appId: "1:495334490672:web:023ae00e9c9d702f3263f5",
  measurementId: "G-EMQLDSZ3ND"
};

// Inicializar Firebase una sola vez (protección)
if (!window.__spent_firebase_initialized) {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.__spent_firebase_initialized = true;
  } catch (err) {
    console.warn('Firebase ya estaba inicializado o falló la inicialización:', err);
  }
}

// --- Constantes y Variables Globales ---
const EXPENSES_STORAGE_KEY = 'spentAppExpenses';
const CATEGORIES_STORAGE_KEY = 'spentAppCategories';

let expenses = [];
let categories = [];
let editingExpenseId = null;
let categoryToEdit = null;
let activeCategoryName = 'General';
let deleteActionType = '';
let deleteTargetId = null;
let expensesChart = null;

let userId = null;
let db = null;
let auth = null;

// --- Referencias DOM ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const loginMessage = document.getElementById('login-message');

const logoutButton = document.getElementById('logout-button');
const exportButton = document.getElementById('export-button');

const categoryTabsScrollWrapper = document.getElementById('category-tabs-scroll-wrapper');
const mainContent = document.getElementById('main-content');
const generalView = document.getElementById('view-General');
const generalTotalAmountSpan = document.getElementById('general-total-amount');
const categoriesGrid = document.getElementById('categories-grid');
const addNewCategoryButton = document.getElementById('add-new-category-button');
const templateCategoryView = document.getElementById('template-category-view');

const expensesPieChartCanvas = document.getElementById('expensesPieChart');
const noChartDataMessage = document.getElementById('no-chart-data-message');

const expenseModal = document.getElementById('expense-modal');
const expenseModalTitle = document.getElementById('expense-modal-title');
const modalExpenseAmountInput = document.getElementById('modal-expense-amount');
const modalExpenseDescriptionInput = document.getElementById('modal-expense-description');
const modalExpenseDateInput = document.getElementById('modal-expense-date');
const modalExpenseCategorySelect = document.getElementById('modal-expense-category-select');
const confirmExpenseButton = document.getElementById('confirm-expense-button');
const cancelExpenseButton = document.getElementById('cancel-expense-button');
const expenseModalMessage = document.getElementById('expense-modal-message');

const addCategoryModal = document.getElementById('add-category-modal');
const newCategoryInput = document.getElementById('new-category-input');
const confirmAddCategoryButton = document.getElementById('confirm-add-category');
const cancelAddCategoryButton = document.getElementById('cancel-add-category');
const categoryModalMessage = document.getElementById('category-modal-message');

const editCategoryModal = document.getElementById('edit-category-modal');
const editCategoryInput = document.getElementById('edit-category-input');
const confirmEditCategoryButton = document.getElementById('confirm-edit-category-button');
const cancelEditCategoryButton = document.getElementById('cancel-edit-category-button');
const editCategoryMessage = document.getElementById('edit-category-message');

const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmDeleteMessage = document.getElementById('confirm-delete-message');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');

const nuevoBotonInvitar = document.getElementById('Invitar');
const infoButton = document.getElementById('Info');
const infoModal = document.getElementById('info-modal');
const closeInfoButton = document.getElementById('close-info-button');
const infoTextContent = document.getElementById('info-text-content');

// --- Utilidades ---
function showMessage(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.className = `info ${type}`;
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatAmount(amount) {
    const n = parseFloat(amount) || 0;
    return n.toFixed(2) + '€';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- Firestore helpers ---
async function getStoredData(key) {
    if (!userId) return [];
    try {
        if (!db) db = firebase.firestore();
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get();
        if (!doc.exists) return [];
        const data = doc.data();
        return data[key] || [];
    } catch (err) {
        console.error('getStoredData error', err);
        return [];
    }
}

async function saveToStorage(key, data) {
    if (!userId) return;
    try {
        if (!db) db = firebase.firestore();
        const docRef = db.collection('users').doc(userId);
        await docRef.set({ [key]: data }, { merge: true });
    } catch (err) {
        console.error('saveToStorage error', err);
    }
}

// --- Carga inicial ---
async function loadAppContent() {
    expenses = await getStoredData(EXPENSES_STORAGE_KEY) || [];
    categories = await getStoredData(CATEGORIES_STORAGE_KEY) || [];

    const generalExists = categories.some(cat => cat.name === "General");
    if (!generalExists) {
        categories = [{ id: 'general-fixed', name: "General" }];
    } else {
        const generalIndex = categories.findIndex(cat => cat.name === "General");
        const generalCategory = categories[generalIndex];
        if (generalCategory.id !== 'general-fixed' || generalIndex !== 0) {
            categories = categories.filter(cat => cat.name !== "General");
            categories.unshift({ id: 'general-fixed', name: "General" });
        }
    }
    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);

    renderCategoryTabs();
    renderAllCategoryViews();
    renderGeneralView();
    activateTab(activeCategoryName);
    updatePieChart();
}

// --- Renderizado ---
function renderCategoryTabs() {
    const existingGeneralTab = document.querySelector('.category-tab[data-category-name="General"]');
    categoryTabsScrollWrapper.innerHTML = '';
    if (existingGeneralTab) categoryTabsScrollWrapper.appendChild(existingGeneralTab);

    const otherCategories = categories.filter(cat => cat.name !== "General");
    otherCategories.forEach(category => {
        const tab = document.createElement('button');
        tab.classList.add('category-tab');
        tab.textContent = category.name;
        tab.dataset.categoryId = category.id;
        tab.dataset.categoryName = category.name;
        tab.addEventListener('click', () => activateTab(category.name));
        categoryTabsScrollWrapper.appendChild(tab);
    });
}

function activateTab(categoryName) {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.categoryName === categoryName) tab.classList.add('active');
    });
    document.querySelectorAll('.category-main-view').forEach(view => {
        if (view.dataset.category === categoryName) view.classList.add('active');
        else view.classList.remove('active');
    });
    activeCategoryName = categoryName;
}

function renderGeneralView() {
    if (generalTotalAmountSpan) generalTotalAmountSpan.textContent = formatAmount(calculateTotalExpenses());
    if (!categoriesGrid) return;
    categoriesGrid.innerHTML = '';

    const categoriesToDisplay = categories.filter(cat => cat.name !== "General");
    if (categoriesToDisplay.length === 0) {
        categoriesGrid.innerHTML = '<p class="no-expenses">Añade tu primera categoría con el botón de abajo.</p>';
    } else {
        categoriesToDisplay.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            categoryItem.dataset.categoryId = category.id;
            const total = calculateTotalExpensesByCategory(category.name);
            categoryItem.innerHTML = `
                <button class="category-name-button" data-category-id="${category.id}" data-category-name="${category.name}">
                    ${category.name} (${formatAmount(total)})
                </button>
                <button class="edit-category-button" data-category-id="${category.id}">Edit</button>
                <button class="delete-category-button" data-category-id="${category.id}">Delete</button>
            `;
            categoriesGrid.appendChild(categoryItem);

            const nameBtn = categoryItem.querySelector('.category-name-button');
            if (nameBtn) nameBtn.addEventListener('click', (e) => activateTab(e.target.dataset.categoryName));

            const editBtn = categoryItem.querySelector('.edit-category-button');
            if (editBtn) editBtn.addEventListener('click', (e) => openEditCategoryModal(e.target.dataset.categoryId));

            const delBtn = categoryItem.querySelector('.delete-category-button');
            if (delBtn) delBtn.addEventListener('click', (e) => {
                const categoryId = e.target.dataset.categoryId;
                const category = categories.find(cat => cat.id === categoryId);
                if (category) openConfirmDeleteModal('category', category.id, `¿Estás seguro de que quieres eliminar la categoría "${category.name}" y todos sus gastos?`);
            });
        });
    }
    updatePieChart();
}

function renderAllCategoryViews() {
    document.querySelectorAll('.category-main-view:not(#view-General)').forEach(v => v.remove());
    categories.forEach(category => {
        if (category.name === "General") return;
        if (!templateCategoryView) return;
        const categoryView = templateCategoryView.cloneNode(true);
        categoryView.id = `view-${category.name.replace(/\s+/g, '-')}`;
        categoryView.dataset.category = category.name;
        categoryView.classList.remove('hidden');
        categoryView.classList.remove('active');
        categoryView.removeAttribute('data-category-template');
        const titleEl = categoryView.querySelector('.category-specific-title');
        if (titleEl) titleEl.textContent = category.name.toUpperCase();
        mainContent.appendChild(categoryView);
        renderExpensesForSpecificCategoryView(category.name);

        const addBtn = categoryView.querySelector('.add-expense-category-button');
        if (addBtn) addBtn.addEventListener('click', () => openExpenseModal(category.name));
    });
}

function renderExpensesForSpecificCategoryView(categoryName) {
    const categoryView = document.getElementById(`view-${categoryName.replace(/\s+/g, '-')}`);
    if (!categoryView) return;
    const expenseList = categoryView.querySelector('.expense-list');
    const noExpensesMessage = categoryView.querySelector('.no-expenses');
    if (expenseList) expenseList.innerHTML = '';

    const expensesForCategory = expenses.filter(exp => exp.category === categoryName);
    const totalForCategory = calculateTotalExpensesByCategory(categoryName);
    const totalSpan = categoryView.querySelector('.category-specific-total');
    if (totalSpan) totalSpan.textContent = formatAmount(totalForCategory);

    if (expensesForCategory.length === 0) {
        if (noExpensesMessage) noExpensesMessage.classList.remove('hidden');
    } else {
        if (noExpensesMessage) noExpensesMessage.classList.add('hidden');
        expensesForCategory.sort((a,b) => new Date(b.date) - new Date(a.date));
        expensesForCategory.forEach(expense => {
            const li = document.createElement('li');
            li.classList.add('expense-item');
            li.innerHTML = `
                <div class="expense-item-details">
                    <strong>${formatAmount(expense.amount)}</strong>
                    <span>${expense.description}</span>
                    <span>${formatDate(expense.date)}</span>
                </div>
                <div class="expense-actions">
                    <button class="edit-button" data-id="${expense.id}" data-category="${expense.category}">Edit</button>
                    <button class="delete-button" data-id="${expense.id}" data-category="${expense.category}">Delete</button>
                </div>
            `;
            if (expenseList) expenseList.appendChild(li);
        });
    }

    categoryView.querySelectorAll('.edit-button').forEach(btn => {
        btn.addEventListener('click', (e) => openExpenseModal(e.target.dataset.category, e.target.dataset.id));
    });
    categoryView.querySelectorAll('.delete-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expenseId = e.target.dataset.id;
            const expense = expenses.find(exp => exp.id === expenseId);
            if (expense) openConfirmDeleteModal('expense', expense.id, `¿Estás seguro de que quieres eliminar el gasto "${expense.description}" de ${formatAmount(expense.amount)}?`);
        });
    });
}

// --- Función auxiliar para refrescar la UI manteniendo la pestaña activa ---
function refreshUI() {
    const currentActiveCategory = activeCategoryName; // Guardamos la categoría actual
    renderCategoryTabs();
    renderAllCategoryViews();
    renderGeneralView();
    activateTab(currentActiveCategory); // Reactivamos la misma categoría
    updatePieChart();
}

// --- Cálculos ---
function calculateTotalExpenses() {
    return expenses.reduce((total, exp) => total + parseFloat(exp.amount || 0), 0);
}

function calculateTotalExpensesByCategory(categoryName) {
    return expenses.filter(exp => exp.category === categoryName).reduce((t, e) => t + parseFloat(e.amount || 0), 0);
}

// --- Gráfico de tarta ---
function updatePieChart() {
    try {
        if (expensesChart) {
            expensesChart.destroy();
            expensesChart = null;
        }
        const categoryTotals = {};
        expenses.forEach(exp => {
            if (exp.category !== 'General') {
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount || 0);
            }
        });
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        if (!expensesPieChartCanvas) return;
        if (labels.length === 0 || data.every(d => d === 0)) {
            expensesPieChartCanvas.classList.add('hidden');
            if (noChartDataMessage) noChartDataMessage.classList.remove('hidden');
            return;
        } else {
            expensesPieChartCanvas.classList.remove('hidden');
            if (noChartDataMessage) noChartDataMessage.classList.add('hidden');
        }
        const backgroundColors = [
            '#0a7aff', '#ff9501', '#34c759', '#5856d6', '#af52de', '#ff3b2f', '#ffcc00', '#a2845e', '#646468', '#007aff'
        ];
        const colors = labels.map((_, i) => backgroundColors[i % backgroundColors.length]);
        const ctx = expensesPieChartCanvas.getContext('2d');
        expensesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { font: { size: 14 } } },
                    tooltip: { callbacks: { label: function(context) { let label = context.label ? context.label + ': ' : ''; if (context.parsed !== null) label += formatAmount(context.parsed); return label; } } }
                }
            }
        });
    } catch (err) {
        console.error('updatePieChart error', err);
    }
}

// --- Modales de Categoría ---
function openAddCategoryModal() {
    if (!addCategoryModal) return;
    addCategoryModal.classList.remove('hidden');
    if (newCategoryInput) newCategoryInput.value = '';
    if (categoryModalMessage) categoryModalMessage.textContent = '';
    if (newCategoryInput) newCategoryInput.focus();
}

function closeAddCategoryModal() {
    if (!addCategoryModal) return;
    addCategoryModal.classList.add('hidden');
}

async function addNewCategory() {
    if (!newCategoryInput) return;
    const categoryName = newCategoryInput.value.trim();
    if (!categoryName) {
        showMessage(categoryModalMessage, 'El nombre de la categoría no puede estar vacío.', 'error');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
        showMessage(categoryModalMessage, 'Esa categoría ya existe.', 'error');
        return;
    }
    const newCategory = { id: generateId(), name: categoryName };
    categories.push(newCategory);
    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);
    refreshUI(); // Usar refreshUI en lugar de renderizado individual
    showMessage(categoryModalMessage, `Categoría "${categoryName}" añadida.`, 'success');
    setTimeout(() => closeAddCategoryModal(), 800);
}

function openEditCategoryModal(categoryId) {
    categoryToEdit = categories.find(cat => cat.id === categoryId);
    if (!categoryToEdit) return;
    if (categoryToEdit.name === "General") {
        if (editCategoryMessage) editCategoryMessage.textContent = "La categoría 'General' no puede ser editada ni eliminada.";
        if (confirmEditCategoryButton) confirmEditCategoryButton.style.display = 'none';
    } else {
        if (editCategoryMessage) editCategoryMessage.textContent = '';
        if (confirmEditCategoryButton) confirmEditCategoryButton.style.display = 'inline-block';
    }
    if (editCategoryInput) editCategoryInput.value = categoryToEdit.name;
    if (editCategoryModal) editCategoryModal.classList.remove('hidden');
    if (editCategoryInput) editCategoryInput.focus();
}

function closeEditCategoryModal() {
    if (!editCategoryModal) return;
    editCategoryModal.classList.add('hidden');
}

async function confirmEditCategory() {
    if (!categoryToEdit) return;
    if (!editCategoryInput) return;
    const newName = editCategoryInput.value.trim();
    if (!newName) {
        showMessage(editCategoryMessage, 'El nombre no puede estar vacío.', 'error');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newName.toLowerCase() && cat.id !== categoryToEdit.id)) {
        showMessage(editCategoryMessage, 'Esa categoría ya existe.', 'error');
        return;
    }
    const oldName = categoryToEdit.name;
    categoryToEdit.name = newName;
    expenses.forEach(exp => { if (exp.category === oldName) exp.category = newName; });
    
    // Si estamos editando la categoría actualmente activa, actualizamos la variable
    if (activeCategoryName === oldName) {
        activeCategoryName = newName;
    }
    
    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);
    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
    refreshUI(); // Usar refreshUI en lugar de renderizado individual
    closeEditCategoryModal();
}

// --- Modales de Gasto ---
function openExpenseModal(categoryName, expenseId = null) {
    editingExpenseId = expenseId;
    if (expenseModalTitle) expenseModalTitle.textContent = expenseId ? 'Editar Gasto' : 'Nuevo Gasto';
    if (modalExpenseAmountInput) modalExpenseAmountInput.value = '';
    if (modalExpenseDescriptionInput) modalExpenseDescriptionInput.value = '';
    if (modalExpenseDateInput) modalExpenseDateInput.value = new Date().toISOString().slice(0, 10);
    if (expenseModalMessage) expenseModalMessage.textContent = '';

    if (modalExpenseCategorySelect) {
        modalExpenseCategorySelect.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            modalExpenseCategorySelect.appendChild(option);
        });
    }

    if (expenseId) {
        const expenseToEdit = expenses.find(exp => exp.id === expenseId);
        if (expenseToEdit) {
            if (modalExpenseAmountInput) modalExpenseAmountInput.value = expenseToEdit.amount;
            if (modalExpenseDescriptionInput) modalExpenseDescriptionInput.value = expenseToEdit.description;
            if (modalExpenseDateInput) modalExpenseDateInput.value = expenseToEdit.date;
            if (modalExpenseCategorySelect) modalExpenseCategorySelect.value = expenseToEdit.category;
        }
    } else if (categoryName && modalExpenseCategorySelect) {
        modalExpenseCategorySelect.value = categoryName;
    }

    if (expenseModal) expenseModal.classList.remove('hidden');
}

function closeExpenseModal() {
    if (!expenseModal) return;
    expenseModal.classList.add('hidden');
}

async function handleConfirmExpense() {
    if (!modalExpenseAmountInput || !modalExpenseDescriptionInput || !modalExpenseDateInput || !modalExpenseCategorySelect) {
        showMessage(expenseModalMessage, 'Faltan campos del modal de gasto en el DOM.', 'error');
        return;
    }
    const amount = parseFloat(modalExpenseAmountInput.value);
    const description = modalExpenseDescriptionInput.value.trim();
    const date = modalExpenseDateInput.value;
    const category = modalExpenseCategorySelect.value;

    if (isNaN(amount) || amount <= 0 || !description || !date) {
        showMessage(expenseModalMessage, 'Por favor, rellena todos los campos correctamente.', 'error');
        return;
    }

    if (editingExpenseId) {
        const expenseToUpdate = expenses.find(exp => exp.id === editingExpenseId);
        if (expenseToUpdate) {
            expenseToUpdate.amount = amount;
            expenseToUpdate.description = description;
            expenseToUpdate.date = date;
            expenseToUpdate.category = category;
        }
    } else {
        const newExpense = { id: generateId(), amount, description, date, category };
        expenses.push(newExpense);
    }

    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
    refreshUI(); // Usar refreshUI para mantener la pestaña activa
    closeExpenseModal();
}

// --- Confirmar borrado ---
function openConfirmDeleteModal(type, targetId, message) {
    deleteActionType = type;
    deleteTargetId = targetId;
    if (confirmDeleteMessage) confirmDeleteMessage.textContent = message;
    if (confirmDeleteModal) confirmDeleteModal.classList.remove('hidden');
}

function closeConfirmDeleteModal() {
    if (confirmDeleteModal) confirmDeleteModal.classList.add('hidden');
    deleteActionType = '';
    deleteTargetId = null;
}

async function handleDeleteConfirm() {
    if (deleteActionType === 'expense') {
        expenses = expenses.filter(exp => exp.id !== deleteTargetId);
        await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
        refreshUI(); // Usar refreshUI para mantener la pestaña activa
    } else if (deleteActionType === 'category') {
        const categoryToDelete = categories.find(cat => cat.id === deleteTargetId);
        if (categoryToDelete) {
            expenses = expenses.filter(exp => exp.category !== categoryToDelete.name);
            categories = categories.filter(cat => cat.id !== deleteTargetId);
            
            // Si estamos eliminando la categoría actualmente activa, cambiar a General
            if (activeCategoryName === categoryToDelete.name) {
                activeCategoryName = 'General';
            }
            
            await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
            await saveToStorage(CATEGORIES_STORAGE_KEY, categories);
            refreshUI(); // Usar refreshUI 
        }
    }
    closeConfirmDeleteModal();
}

// --- Exportar ---
function exportDataToTextFile() {
    const data = JSON.stringify({ expenses, categories }, null, 2);
    const blob = new Blob([data], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'spentApp_data.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- Invitar / Info ---
function invitarViaWhatsApp() {
    const message = "¡Hola! Te invito a usar la app de gastos SpentApp. Es súper útil para llevar un registro de tus finanzas. Puedes descargar el código aquí: https://mentis1.github.io/Spent/";
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function openInfoModal() {
    const infoText = `
        <p><strong>SpentApp v1.0</strong></p>
        <p>Aplicación de gestión de gastos personales.</p>
        <p>App web desarrollada por Diego para aprender programación</p>
        <p><strong>Es una app sin ánimo de lucro</strong></p>
    `;
    if (infoTextContent) infoTextContent.innerHTML = infoText;
    if (infoModal) infoModal.classList.remove('hidden');
}

function closeInfoModal() {
    if (infoModal) infoModal.classList.add('hidden');
}

// --- Listeners & Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // Listeners de login/registro
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (registerButton) registerButton.addEventListener('click', handleRegister);

    // Otros listeners
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (exportButton) exportButton.addEventListener('click', exportDataToTextFile);

    if (addNewCategoryButton) addNewCategoryButton.addEventListener('click', openAddCategoryModal);
    if (confirmAddCategoryButton) confirmAddCategoryButton.addEventListener('click', addNewCategory);
    if (cancelAddCategoryButton) cancelAddCategoryButton.addEventListener('click', closeAddCategoryModal);

    if (confirmExpenseButton) confirmExpenseButton.addEventListener('click', handleConfirmExpense);
    if (cancelExpenseButton) cancelExpenseButton.addEventListener('click', closeExpenseModal);

    if (confirmEditCategoryButton) confirmEditCategoryButton.addEventListener('click', confirmEditCategory);
    if (cancelEditCategoryButton) cancelEditCategoryButton.addEventListener('click', closeEditCategoryModal);

    if (confirmDeleteButton) confirmDeleteButton.addEventListener('click', handleDeleteConfirm);
    if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', closeConfirmDeleteModal);

    const generalTab = document.querySelector('.category-tab[data-category-name="General"]');
    if (generalTab) generalTab.addEventListener('click', () => activateTab('General'));

    if (nuevoBotonInvitar) nuevoBotonInvitar.addEventListener('click', invitarViaWhatsApp);
    if (infoButton) infoButton.addEventListener('click', openInfoModal);
    if (closeInfoButton) closeInfoButton.addEventListener('click', closeInfoModal);

    [addCategoryModal, expenseModal, editCategoryModal, confirmDeleteModal, infoModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    });
});

// --- Auth: login/register/logout (compat API) ---
async function handleLogin() {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showMessage(loginMessage, "Inicio de sesión exitoso.", 'success');
    } catch (error) {
        let message = "Error al iniciar sesión.";
        if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = "Correo electrónico o contraseña incorrectos.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Demasiados intentos de inicio de sesión fallidos. Inténtalo de nuevo más tarde.";
        }
        showMessage(loginMessage, message, 'error');
    }
}

async function handleRegister() {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        showMessage(loginMessage, "Registro exitoso. Iniciando sesión...", 'success');
    } catch (error) {
        let message = "Error al registrarse.";
        if (error.code === 'auth/email-already-in-use') {
            message = "Ese correo ya está en uso.";
        } else if (error.code === 'auth/weak-password') {
            message = "La contraseña debe tener al menos 6 caracteres.";
        }
        showMessage(loginMessage, message, 'error');
    }
}

function handleLogout() {
    firebase.auth().signOut().then(() => {
        showMessage(loginMessage, "Sesión cerrada correctamente.", 'success');
        if (loginEmailInput) loginEmailInput.value = '';
        if (loginPasswordInput) loginPasswordInput.value = '';
    }).catch((error) => {
        console.error("Error al cerrar sesión: ", error);
    });
}

// Escuchar cambios de autenticación
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        userId = user.uid;
        db = firebase.firestore();
        auth = firebase.auth();
        if (loginContainer) loginContainer.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        loadAppContent();
    } else {
        userId = null;
        db = null;
        auth = null;
        if (appContainer) appContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'flex';
    }
});