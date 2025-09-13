// --- Constantes y Variables Globales ---
const CORRECT_PIN = "2580"; // Contraseña PIN
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

// --- Referencias DOM ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const loginMessage = document.getElementById('login-message');
const logoutButton = document.getElementById('logout-button');
const numericKeypad = document.getElementById('numeric-keypad');
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

// --- Helpers Firestore / Auth ---
// Espera a que haya un usuario autenticado (si no, hace signInAnonymously)
function ensureAuth() {
    return new Promise((resolve, reject) => {
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (user) {
                unsub();
                resolve(user);
            } else {
                try {
                    const cred = await auth.signInAnonymously();
                    unsub();
                    resolve(cred.user);
                } catch (err) {
                    console.error('Error signInAnonymously', err);
                    reject(err);
                }
            }
        });
    });
}

async function getStoredData(key) {
    try {
        await ensureAuth();
        const uid = auth.currentUser && auth.currentUser.uid;
        if (!uid) return [];
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return [];
        const data = doc.data();
        return data[key] || [];
    } catch (err) {
        console.error('getStoredData error', err);
        return [];
    }
}

async function saveToStorage(key, data) {
    try {
        await ensureAuth();
        const uid = auth.currentUser && auth.currentUser.uid;
        if (!uid) return;
        await db.collection('users').doc(uid).set({ [key]: data }, { merge: true });
    } catch (err) {
        console.error('saveToStorage error', err);
    }
}

// --- Utilidades ---
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}
function formatAmount(amount) {
    return parseFloat(amount).toFixed(2) + '€';
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- Autenticación y Login (PIN) ---
async function checkAuth() {
    try {
        await ensureAuth();
        // No forzamos mostrar la app: sigue visible la pantalla de PIN hasta que el usuario lo escriba.
        console.log('Auth lista (anonima) =>', auth.currentUser && auth.currentUser.uid);
    } catch (err) {
        console.error('checkAuth error', err);
    }
}

async function handleLogin() {
    const enteredPin = passwordInput.value;
    if (enteredPin === CORRECT_PIN) {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loginMessage.textContent = '';
        await loadAppContent();
    } else {
        loginMessage.textContent = 'PIN incorrecto. Inténtalo de nuevo.';
        passwordInput.value = '';
    }
}

function handleLogout() {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    passwordInput.value = '';
    loginMessage.textContent = '';
    activeCategoryName = 'General';
    if (expensesChart) {
        expensesChart.destroy();
        expensesChart = null;
    }
}

// --- Teclado numérico ---
function handleKeypadClick(event) {
    const button = event.target;
    if (button.classList.contains('keypad-button')) {
        const value = button.textContent;
        if (button.classList.contains('clear-button')) {
            passwordInput.value = '';
        } else if (button.classList.contains('delete-button')) {
            passwordInput.value = passwordInput.value.slice(0, -1);
        } else {
            if (passwordInput.value.length < CORRECT_PIN.length) {
                passwordInput.value += value;
            }
            if (passwordInput.value.length === CORRECT_PIN.length) {
                handleLogin();
            }
        }
    }
}

// --- Carga inicial: categorías y gastos desde Firestore ---
async function loadAppContent() {
    expenses = await getStoredData(EXPENSES_STORAGE_KEY);
    categories = await getStoredData(CATEGORIES_STORAGE_KEY);

    // Asegurar que haya General
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

// --- Renderizado de pestañas y vistas ---
function renderCategoryTabs() {
    const generalTabElement = document.querySelector('.category-tab[data-category-name="General"]');
    categoryTabsScrollWrapper.innerHTML = '';
    if (generalTabElement) categoryTabsScrollWrapper.appendChild(generalTabElement);

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
    generalTotalAmountSpan.textContent = formatAmount(calculateTotalExpenses());
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

            categoryItem.querySelector('.category-name-button')
                .addEventListener('click', (e) => activateTab(e.target.dataset.categoryName));

            categoryItem.querySelector('.edit-category-button')
                .addEventListener('click', (e) => openEditCategoryModal(e.target.dataset.categoryId));

            categoryItem.querySelector('.delete-category-button')
                .addEventListener('click', (e) => {
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
        const categoryView = templateCategoryView.cloneNode(true);
        categoryView.id = `view-${category.name.replace(/\s+/g, '-')}`;
        categoryView.dataset.category = category.name;
        categoryView.classList.remove('hidden');
        categoryView.classList.remove('active');
        categoryView.removeAttribute('data-category-template');
        categoryView.querySelector('.category-specific-title').textContent = category.name.toUpperCase();
        mainContent.appendChild(categoryView);
        renderExpensesForSpecificCategoryView(category.name);

        categoryView.querySelector('.add-expense-category-button').addEventListener('click', () => openExpenseModal(category.name));
    });
}

function renderExpensesForSpecificCategoryView(categoryName) {
    const categoryView = document.getElementById(`view-${categoryName.replace(/\s+/g, '-')}`);
    if (!categoryView) return;
    const expenseList = categoryView.querySelector('.expense-list');
    const noExpensesMessage = categoryView.querySelector('.no-expenses');
    expenseList.innerHTML = '';

    const expensesForCategory = expenses.filter(exp => exp.category === categoryName);
    const totalForCategory = calculateTotalExpensesByCategory(categoryName);
    categoryView.querySelector('.category-specific-total').textContent = formatAmount(totalForCategory);

    if (expensesForCategory.length === 0) {
        noExpensesMessage.classList.remove('hidden');
    } else {
        noExpensesMessage.classList.add('hidden');
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
            expenseList.appendChild(li);
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

// --- Cálculos ---
function calculateTotalExpenses() {
    return expenses.reduce((total, exp) => total + parseFloat(exp.amount), 0);
}
function calculateTotalExpensesByCategory(categoryName) {
    return expenses.filter(exp => exp.category === categoryName).reduce((t, e) => t + parseFloat(e.amount), 0);
}

// --- Gráfico de tarta ---
function updatePieChart() {
    if (expensesChart) { expensesChart.destroy(); expensesChart = null; }
    const categoryTotals = {};
    expenses.forEach(exp => {
        if (exp.category !== 'General') {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
        }
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (labels.length === 0 || data.every(d => d === 0)) {
        expensesPieChartCanvas.classList.add('hidden');
        noChartDataMessage.classList.remove('hidden');
        return;
    } else {
        expensesPieChartCanvas.classList.remove('hidden');
        noChartDataMessage.classList.add('hidden');
    }

    const backgroundColors = [
        '#0a7aff','#ff9501','#34c759','#5856d6','#af52de','#ff3b2f','#ffcc00','#a2845e','#646468','#007aff'
    ];
    const colors = labels.map((_, i) => backgroundColors[i % backgroundColors.length]);
    const ctx = expensesPieChartCanvas.getContext('2d');
    expensesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{ data, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 14 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label ? context.label + ': ' : '';
                            if (context.parsed !== null) label += formatAmount(context.parsed);
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- Modales de Categoría ---
function openAddCategoryModal() {
    addCategoryModal.classList.remove('hidden');
    newCategoryInput.value = '';
    categoryModalMessage.textContent = '';
    newCategoryInput.focus();
}
function closeAddCategoryModal() {
    addCategoryModal.classList.add('hidden');
}

async function addNewCategory() {
    const categoryName = newCategoryInput.value.trim();
    if (!categoryName) {
        categoryModalMessage.textContent = 'El nombre de la categoría no puede estar vacío.';
        categoryModalMessage.classList.add('error');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
        categoryModalMessage.textContent = 'Esa categoría ya existe.';
        categoryModalMessage.classList.add('error');
        return;
    }
    const newCategory = { id: generateId(), name: categoryName };
    categories.push(newCategory);
    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);

    renderCategoryTabs();
    renderGeneralView();
    renderAllCategoryViews();
    updatePieChart();

    categoryModalMessage.textContent = `Categoría "${categoryName}" añadida.`;
    categoryModalMessage.classList.remove('error');
    categoryModalMessage.classList.add('info');

    setTimeout(() => closeAddCategoryModal(), 800);
}

function openEditCategoryModal(categoryId) {
    categoryToEdit = categories.find(cat => cat.id === categoryId);
    if (!categoryToEdit) return;
    if (categoryToEdit.name === "General") {
        editCategoryMessage.textContent = "La categoría 'General' no puede ser editada.";
        editCategoryMessage.classList.add('error');
        setTimeout(() => { editCategoryModal.classList.add('hidden'); editCategoryMessage.textContent=''; }, 1500);
        return;
    }
    editCategoryInput.value = categoryToEdit.name;
    editCategoryModal.classList.remove('hidden');
    editCategoryMessage.textContent = '';
    editCategoryInput.focus();
}
function closeEditCategoryModal() {
    editCategoryModal.classList.add('hidden');
    categoryToEdit = null;
}

async function confirmEditCategory() {
    if (!categoryToEdit) return;
    const newCategoryName = editCategoryInput.value.trim();
    if (!newCategoryName) {
        editCategoryMessage.textContent = 'El nombre de la categoría no puede estar vacío.';
        editCategoryMessage.classList.add('error');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase() && cat.id !== categoryToEdit.id)) {
        editCategoryMessage.textContent = 'Esa categoría ya existe.';
        editCategoryMessage.classList.add('error');
        return;
    }
    if (categoryToEdit.name === "General") {
        editCategoryMessage.textContent = "No se puede renombrar la categoría 'General'.";
        editCategoryMessage.classList.add('error');
        return;
    }

    const oldCategoryName = categoryToEdit.name;
    categoryToEdit.name = newCategoryName;
    // Actualizar gastos
    expenses.forEach(exp => { if (exp.category === oldCategoryName) exp.category = newCategoryName; });

    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);
    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);

    editCategoryMessage.textContent = `Categoría renombrada a "${newCategoryName}".`;
    editCategoryMessage.classList.remove('error');
    editCategoryMessage.classList.add('info');

    renderCategoryTabs();
    renderGeneralView();
    renderAllCategoryViews();
    activateTab(newCategoryName);
    updatePieChart();

    setTimeout(() => closeEditCategoryModal(), 900);
}

// --- Modales de Gasto ---
function openExpenseModal(categoryName, expenseId = null) {
    expenseModal.classList.remove('hidden');
    expenseModalMessage.textContent = '';
    modalExpenseCategorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        modalExpenseCategorySelect.appendChild(option);
    });

    if (expenseId) {
        editingExpenseId = expenseId;
        expenseModalTitle.textContent = 'Editar Gasto';
        confirmExpenseButton.textContent = 'Guardar Cambios';
        const expense = expenses.find(e => e.id === expenseId);
        if (expense) {
            modalExpenseAmountInput.value = expense.amount;
            modalExpenseDescriptionInput.value = expense.description;
            modalExpenseDateInput.value = expense.date;
            modalExpenseCategorySelect.value = expense.category;
        }
    } else {
        editingExpenseId = null;
        expenseModalTitle.textContent = 'Añadir Nuevo Gasto';
        confirmExpenseButton.textContent = 'Añadir Gasto';
        modalExpenseAmountInput.value = '';
        modalExpenseDescriptionInput.value = '';
        modalExpenseDateInput.value = new Date().toISOString().split('T')[0];
        modalExpenseCategorySelect.value = categoryName || categories[0]?.name || '';
    }
    modalExpenseAmountInput.focus();
}

function closeExpenseModal() {
    expenseModal.classList.add('hidden');
    editingExpenseId = null;
    expenseModalMessage.textContent = '';
}

async function handleConfirmExpense() {
    const amount = parseFloat(modalExpenseAmountInput.value);
    const description = modalExpenseDescriptionInput.value.trim();
    const date = modalExpenseDateInput.value;
    const category = modalExpenseCategorySelect.value;

    if (isNaN(amount) || amount <= 0) {
        expenseModalMessage.textContent = 'Por favor, introduce una cantidad válida.';
        expenseModalMessage.classList.add('error');
        return;
    }
    if (!description) {
        expenseModalMessage.textContent = 'Por favor, introduce una descripción.';
        expenseModalMessage.classList.add('error');
        return;
    }
    if (!date) {
        expenseModalMessage.textContent = 'Por favor, selecciona una fecha.';
        expenseModalMessage.classList.add('error');
        return;
    }
    if (!category) {
        expenseModalMessage.textContent = 'Por favor, selecciona una categoría.';
        expenseModalMessage.classList.add('error');
        return;
    }

    if (editingExpenseId) {
        const idx = expenses.findIndex(e => e.id === editingExpenseId);
        if (idx !== -1) {
            expenses[idx] = { id: editingExpenseId, amount, description, date, category };
            expenseModalMessage.textContent = 'Gasto actualizado con éxito.';
        }
    } else {
        const newExpense = { id: generateId(), amount, description, date, category };
        expenses.push(newExpense);
        expenseModalMessage.textContent = 'Gasto añadido con éxito.';
    }

    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);

    renderGeneralView();
    renderExpensesForSpecificCategoryView(activeCategoryName);
    updatePieChart();

    setTimeout(() => closeExpenseModal(), 800);
}

// --- Confirm delete ---
function openConfirmDeleteModal(type, id, message) {
    deleteActionType = type;
    deleteTargetId = id;
    confirmDeleteMessage.textContent = message;
    confirmDeleteModal.classList.remove('hidden');
}
function closeConfirmDeleteModal() {
    confirmDeleteModal.classList.add('hidden');
    deleteActionType = '';
    deleteTargetId = null;
    confirmDeleteMessage.textContent = '';
}

async function handleDeleteConfirm() {
    if (deleteActionType === 'category') {
        const cat = categories.find(c => c.id === deleteTargetId);
        if (!cat) return;
        if (cat.name === "General") {
            confirmDeleteMessage.textContent = "No se puede eliminar la categoría 'General'.";
            confirmDeleteMessage.classList.add('error');
            setTimeout(() => closeConfirmDeleteModal(), 1200);
            return;
        }
        await deleteCategory(deleteTargetId);
    } else if (deleteActionType === 'expense') {
        await deleteExpense(deleteTargetId);
    }
    closeConfirmDeleteModal();
}

async function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    expenses = expenses.filter(e => e.category !== category.name);
    categories = categories.filter(c => c.id !== categoryId);
    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
    await saveToStorage(CATEGORIES_STORAGE_KEY, categories);

    renderCategoryTabs();
    renderGeneralView();
    renderAllCategoryViews();
    activateTab('General');
    updatePieChart();
}

async function deleteExpense(expenseId) {
    expenses = expenses.filter(e => e.id !== expenseId);
    await saveToStorage(EXPENSES_STORAGE_KEY, expenses);
    renderGeneralView();
    renderExpensesForSpecificCategoryView(activeCategoryName);
    updatePieChart();
}

// --- Export a texto ---
function exportDataToTextFile() {
    let textContent = "Reporte de Gastos Spent\n\n";
    const sortedCategories = [...categories].sort((a,b) => {
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        return a.name.localeCompare(b.name);
    });
    sortedCategories.forEach(category => {
        textContent += `Categoría: ${category.name.toUpperCase()}\n`;
        textContent += `Total en ${category.name}: ${formatAmount(calculateTotalExpensesByCategory(category.name))}\n`;
        textContent += "--------------------------------------\n";
        const expensesForCategory = expenses.filter(e => e.category === category.name);
        if (expensesForCategory.length === 0) {
            textContent += "  No hay gastos en esta categoría.\n";
        } else {
            expensesForCategory.sort((a,b) => new Date(b.date) - new Date(a.date));
            expensesForCategory.forEach(exp => {
                textContent += `  Fecha: ${formatDate(exp.date)}\n`;
                textContent += `  Cantidad: ${formatAmount(exp.amount)}\n`;
                textContent += `  Descripción: ${exp.description}\n`;
                textContent += "  ---\n";
            });
        }
        textContent += "\n";
    });

    const encodedUri = encodeURIComponent(textContent);
    const link = document.createElement("a");
    link.setAttribute("href", `data:text/plain;charset=utf-8,${encodedUri}`);
    link.setAttribute("download", "Mi reporte de gastos.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Botón invitar WhatsApp ---
function invitarViaWhatsApp() {
    const message = `¡Hola!, soy Diego.\n\n¡Te invito a usar esta web-app que he creado para contabilizar tus gastos!\n\n🔒Los gastos se almacenan localmente en tu dispositivo, por lo que es totalmente segura. 🔒\n\nhttps://mentis1.github.io/Spent/\n\n🤫El código de acceso es 2580🤫`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

// --- Info modal handlers ---
function openInfoModal() { infoModal.classList.remove('hidden'); }
function closeInfoModal() { infoModal.classList.add('hidden'); }

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().catch(e => console.error('Auth init error', e));
});

numericKeypad.addEventListener('click', handleKeypadClick);
logoutButton.addEventListener('click', handleLogout);
exportButton.addEventListener('click', exportDataToTextFile);

addNewCategoryButton.addEventListener('click', openAddCategoryModal);
confirmAddCategoryButton.addEventListener('click', addNewCategory);
cancelAddCategoryButton.addEventListener('click', closeAddCategoryModal);

confirmExpenseButton.addEventListener('click', handleConfirmExpense);
cancelExpenseButton.addEventListener('click', closeExpenseModal);

confirmEditCategoryButton.addEventListener('click', confirmEditCategory);
cancelEditCategoryButton.addEventListener('click', closeEditCategoryModal);

confirmDeleteButton.addEventListener('click', handleDeleteConfirm);
cancelDeleteButton.addEventListener('click', closeConfirmDeleteModal);

document.querySelector('.category-tab[data-category-name="General"]').addEventListener('click', () => activateTab('General'));

if (nuevoBotonInvitar) nuevoBotonInvitar.addEventListener('click', invitarViaWhatsApp);
if (infoButton) infoButton.addEventListener('click', openInfoModal);
if (closeInfoButton) closeInfoButton.addEventListener('click', closeInfoModal);

// Cerrar modales al hacer click fuera
[addCategoryModal, expenseModal, editCategoryModal, confirmDeleteModal, infoModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});
