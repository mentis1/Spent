// --- Constantes y Variables Globales ---
const CORRECT_PASSWORD = "caca"; // ¡¡¡CAMBIA ESTA CONTRASEÑA EN UN ENTORNO REAL!!!

const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');
const logoutButton = document.getElementById('logout-button');

const categoryTabsContainer = document.getElementById('category-tabs');
const addCategoryButton = document.getElementById('add-category-button');
const manageCategoriesButton = document.getElementById('manage-categories-button'); // Nuevo botón
const categoryViewContainer = document.getElementById('category-view-container');

// Modal de Añadir Categoría
const addCategoryModal = document.getElementById('add-category-modal');
const newCategoryInput = document.getElementById('new-category-input');
const confirmAddCategoryButton = document.getElementById('confirm-add-category');
const cancelAddCategoryButton = document.getElementById('cancel-add-category');
const categoryModalMessage = document.getElementById('category-modal-message');

// Modal de Añadir/Editar Gasto
const expenseModal = document.getElementById('expense-modal');
const expenseModalTitle = document.getElementById('expense-modal-title');
const modalExpenseAmountInput = document.getElementById('modal-expense-amount');
const modalExpenseDescriptionInput = document.getElementById('modal-expense-description');
const modalExpenseDateInput = document.getElementById('modal-expense-date');
const modalExpenseCategorySelect = document.getElementById('modal-expense-category-select');
const confirmExpenseButton = document.getElementById('confirm-expense-button');
const cancelExpenseButton = document.getElementById('cancel-expense-button');
const expenseModalMessage = document.getElementById('expense-modal-message');

// Modal para Gestionar Categorías (Nuevo)
const manageCategoriesModal = document.getElementById('manage-categories-modal');
const editableCategoryList = document.getElementById('editable-category-list');
const closeManageCategoriesModalButton = document.getElementById('close-manage-categories-modal');
const manageCategoryMessage = document.getElementById('manage-category-message');

let expenses = []; // Array para almacenar todos los gastos
let categories = []; // Array para almacenar las categorías
let activeCategory = 'General'; // Categoría activa actualmente mostrada

// --- Funciones de LocalStorage ---
function saveExpenses() {
    try {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    } catch (e) {
        console.error("Error al guardar gastos en LocalStorage:", e);
        alert("No se pudieron guardar los gastos. ¿LocalStorage lleno o problema de permisos?");
    }
}

function loadExpenses() {
    try {
        const storedExpenses = localStorage.getItem('expenses');
        expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
        // Asegurarse de que los IDs sean números para la comparación
        expenses.forEach(exp => exp.id = parseInt(exp.id));
    } catch (e) {
        console.error("Error al cargar gastos de LocalStorage:", e);
        expenses = []; // Reiniciar si hay un error en los datos guardados
        alert("Hubo un problema al cargar tus gastos guardados. Se ha iniciado con una lista vacía.");
    }
}

function saveCategories() {
    try {
        localStorage.setItem('categories', JSON.stringify(categories));
    } catch (e) {
        console.error("Error al guardar categorías en LocalStorage:", e);
        alert("No se pudieron guardar las categorías. ¿LocalStorage lleno o problema de permisos?");
    }
}

function loadCategories() {
    try {
        const storedCategories = localStorage.getItem('categories');
        categories = storedCategories ? JSON.parse(storedCategories) : [];
        // Aseguramos que siempre haya al menos 'General' si no hay ninguna
        if (!categories.includes('General')) {
            categories.unshift('General'); // Añadir 'General' al principio
        }
        saveCategories(); // Guardar si se añadió 'General'
    } catch (e) {
        console.error("Error al cargar categorías de LocalStorage:", e);
        categories = ['General']; // Reiniciar si hay un error en los datos guardados
        saveCategories();
        alert("Hubo un problema al cargar tus categorías guardadas. Se ha iniciado con la categoría 'General'.");
    }
}

// --- Funciones de Autenticación ---
function checkAuth() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
    passwordInput.value = '';
    loginMessage.textContent = '';
    passwordInput.focus();
}

function showApp() {
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    loadCategories(); 
    loadExpenses(); 
    renderCategoryTabs(); // Generar las pestañas
    updateCategorySelects(); // Rellenar los selects de categoría en los modales
    
    // Si la categoría activa ya no existe, volvemos a "General"
    if (!categories.includes(activeCategory)) {
        activeCategory = 'General';
    }
    showCategoryView(activeCategory); // Mostrar la vista de la categoría activa
}

function handleLogin() {
    const enteredPassword = passwordInput.value;
    if (enteredPassword === CORRECT_PASSWORD) {
        localStorage.setItem('isAuthenticated', 'true');
        showApp();
    } else {
        loginMessage.textContent = 'Contraseña incorrecta.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function handleLogout() {
    localStorage.removeItem('isAuthenticated');
    showLogin();
}

// --- Funciones de Pestañas y Vistas de Categoría ---
function renderCategoryTabs() {
    categoryTabsContainer.innerHTML = ''; // Limpiar pestañas existentes
    categories.forEach(cat => {
        const tab = document.createElement('div');
        tab.classList.add('category-tab');
        tab.textContent = cat;
        tab.dataset.category = cat;
        if (cat === activeCategory) {
            tab.classList.add('active');
        }
        tab.addEventListener('click', () => showCategoryView(cat));
        categoryTabsContainer.appendChild(tab);
    });
}

function showCategoryView(categoryName) {
    activeCategory = categoryName;

    // Actualizar clase activa en las pestañas
    document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.dataset.category === categoryName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Generar el contenido de la vista de la categoría
    let categoryExpenses = expenses;
    if (categoryName !== 'General') {
        categoryExpenses = expenses.filter(exp => exp.category === categoryName);
    }

    const totalCategoryExpenses = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Actualizar el título de la pestaña 'General' para mostrar el total global
    const generalTab = document.querySelector('.category-tab[data-category="General"]');
    if (generalTab && categoryName === 'General') {
        const totalGlobal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        // generalTab.textContent = `General (${totalGlobal.toFixed(2)}€)`; // Opcional: mostrar total en la pestaña
    } else if (generalTab) {
        // generalTab.textContent = 'General'; // Resetear si no es la pestaña activa
    }


    categoryViewContainer.innerHTML = `
        <div class="main-content">
            <section class="summary-section">
                <h2>Resumen de Gastos: ${categoryName}</h2>
                <div class="summary-item">
                    <h3>Total Gastos: <span class="total-amount">${totalCategoryExpenses.toFixed(2)}€</span></h3>
                </div>
                ${categoryName === 'General' ? `
                    <div class="summary-item">
                        <h3>Totales por Categoría:</h3>
                        <ul id="category-totals-list">
                            </ul>
                    </div>
                    <button id="export-txt-button" class="apple-button">Exportar a TXT</button>
                ` : ''}
            </section>

            <section class="expense-list-section">
                <div class="section-header">
                    <h2>${categoryName}</h2>
                    <button id="add-new-expense-button" class="apple-button">Añadir Nuevo Gasto</button>
                </div>
                <ul id="expense-list">
                    </ul>
            </section>
        </div>
    `;

    // Asignar event listeners a los botones recién creados
    document.getElementById('add-new-expense-button').addEventListener('click', () => openExpenseModal(null, categoryName));
    
    if (categoryName === 'General') {
        document.getElementById('export-txt-button').addEventListener('click', exportToTxt);
        updateOverallSummary(); 
    }
    
    renderExpensesList(categoryExpenses); 
    if (categoryName === 'General') {
        updateOverallSummary();
    }
}

// Función para actualizar el resumen GENERAL (solo para la pestaña 'General')
function updateOverallSummary() {
    const totalExpensesSpan = document.querySelector('#category-view-container .total-amount');
    const categoryTotalsList = document.getElementById('category-totals-list');

    let total = 0;
    const categoryTotals = {};

    categories.filter(c => c !== 'General').forEach(cat => { 
        categoryTotals[cat] = 0;
    });

    expenses.forEach(expense => {
        total += expense.amount;
        if (categoryTotals[expense.category] !== undefined) { 
            categoryTotals[expense.category] += expense.amount;
        } else if (expense.category && expense.category !== 'General') { 
            // Esto maneja gastos con categorías que pudieron haber sido eliminadas o mal escritas
            if (!categoryTotals['Sin Categoría']) categoryTotals['Sin Categoría'] = 0;
            categoryTotals['Sin Categoría'] += expense.amount;
        }
    });

    if (totalExpensesSpan) { 
         totalExpensesSpan.textContent = `${total.toFixed(2)}€`;
    }
   

    if (categoryTotalsList) { 
        categoryTotalsList.innerHTML = '';
        const sortedCategories = Object.keys(categoryTotals).sort();
        if (sortedCategories.length === 0) {
            categoryTotalsList.innerHTML = '<li>No hay gastos por categoría.</li>';
        } else {
            sortedCategories.forEach(cat => {
                const li = document.createElement('li');
                li.textContent = `${cat}: ${categoryTotals[cat].toFixed(2)}€`;
                categoryTotalsList.appendChild(li);
            });
        }
    }
}


// --- Funciones de Modales (Añadir Categoría y Gasto) ---
function openAddCategoryModal() {
    addCategoryModal.classList.remove('hidden');
    newCategoryInput.value = '';
    categoryModalMessage.textContent = '';
    newCategoryInput.focus();
}

function closeAddCategoryModal() {
    addCategoryModal.classList.add('hidden');
}

function openExpenseModal(expenseId = null, defaultCategory = '') {
    expenseModal.classList.remove('hidden');
    expenseModalMessage.textContent = '';
    updateCategorySelects(); // Asegurarse de que las categorías estén actualizadas en el select

    if (expenseId) {
        // Modo edición
        expenseModalTitle.textContent = 'Editar Gasto';
        confirmExpenseButton.textContent = 'Actualizar Gasto';
        confirmExpenseButton.dataset.editingId = expenseId;

        const expenseToEdit = expenses.find(exp => exp.id === expenseId);
        if (expenseToEdit) {
            modalExpenseAmountInput.value = expenseToEdit.amount;
            modalExpenseDescriptionInput.value = expenseToEdit.description;
            modalExpenseDateInput.value = expenseToEdit.date;
            modalExpenseCategorySelect.value = expenseToEdit.category;
        }
    } else {
        // Modo añadir
        expenseModalTitle.textContent = 'Añadir Nuevo Gasto';
        confirmExpenseButton.textContent = 'Añadir Gasto';
        confirmExpenseButton.removeAttribute('data-editingId');
        
        modalExpenseAmountInput.value = '';
        modalExpenseDescriptionInput.value = '';
        modalExpenseDateInput.value = new Date().toISOString().slice(0, 10); // Fecha actual por defecto
        
        // --- CAMBIO AQUÍ: Preseleccionar categoría en el modal ---
        if (defaultCategory && defaultCategory !== 'General' && categories.includes(defaultCategory)) {
            modalExpenseCategorySelect.value = defaultCategory;
        } else {
            modalExpenseCategorySelect.value = ''; // O ninguna seleccionada
        }
        // --------------------------------------------------------
    }
    modalExpenseAmountInput.focus();
}

function closeExpenseModal() {
    expenseModal.classList.add('hidden');
    // Limpiar formulario y restablecer
    modalExpenseAmountInput.value = '';
    modalExpenseDescriptionInput.value = '';
    modalExpenseDateInput.value = '';
    modalExpenseCategorySelect.value = '';
}

// --- Funciones para Gestionar Categorías (Nuevo) ---
function openManageCategoriesModal() {
    manageCategoriesModal.classList.remove('hidden');
    renderEditableCategoryList();
    manageCategoryMessage.textContent = ''; // Limpiar mensajes previos
}

function closeManageCategoriesModal() {
    manageCategoriesModal.classList.add('hidden');
}

function renderEditableCategoryList() {
    editableCategoryList.innerHTML = '';
    const categoriesToDisplay = categories.filter(cat => cat !== 'General'); // No mostrar 'General'

    if (categoriesToDisplay.length === 0) {
        editableCategoryList.innerHTML = '<li class="no-expenses">No hay categorías para gestionar (excepto General).</li>';
        return;
    }

    categoriesToDisplay.forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${cat}</span>
            <button class="delete-category-btn" data-category="${cat}">Eliminar</button>
        `;
        editableCategoryList.appendChild(li);
    });

    document.querySelectorAll('.delete-category-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const categoryToDelete = e.target.dataset.category;
            deleteCategory(categoryToDelete);
        });
    });
}

function deleteCategory(categoryToDelete) {
    if (categoryToDelete === 'General') {
        manageCategoryMessage.textContent = 'La categoría "General" no puede ser eliminada.';
        manageCategoryMessage.classList.add('error');
        manageCategoryMessage.classList.remove('info');
        return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryToDelete}"? Los gastos asociados se moverán a "General".`)) {
        // Mover los gastos de la categoría a "General"
        expenses.forEach(exp => {
            if (exp.category === categoryToDelete) {
                exp.category = 'General';
            }
        });
        saveExpenses(); // Guardar gastos actualizados

        // Eliminar la categoría de la lista de categorías
        categories = categories.filter(cat => cat !== categoryToDelete);
        saveCategories(); // Guardar categorías actualizadas

        manageCategoryMessage.textContent = `Categoría "${categoryToDelete}" eliminada. Los gastos se movieron a "General".`;
        manageCategoryMessage.classList.add('info');
        manageCategoryMessage.classList.remove('error');

        renderCategoryTabs(); // Actualizar las pestañas
        updateCategorySelects(); // Actualizar los selects de categorías
        renderEditableCategoryList(); // Volver a renderizar la lista de categorías en el modal

        // Si la categoría activa era la eliminada, cambiar a "General"
        if (activeCategory === categoryToDelete) {
            showCategoryView('General');
        } else {
            showCategoryView(activeCategory); // Refrescar la vista actual
        }
    }
}


// --- Funciones de Categorías ---
function updateCategorySelects() {
    // Para el modal de añadir/editar gasto
    modalExpenseCategorySelect.innerHTML = '<option value="">Selecciona Categoría</option>';
    // Excluir 'General' de las opciones de categoría para un gasto específico
    categories.filter(cat => cat !== 'General').forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        modalExpenseCategorySelect.appendChild(option);
    });
}

function addNewCategory() {
    const newCat = newCategoryInput.value.trim();
    if (newCat) {
        const formattedCat = newCat.charAt(0).toUpperCase() + newCat.slice(1).toLowerCase();

        if (!categories.includes(formattedCat)) {
            categories.push(formattedCat);
            saveCategories();
            renderCategoryTabs(); // Volver a renderizar pestañas
            updateCategorySelects(); // Actualizar selects de categoría
            categoryModalMessage.textContent = `Categoría "${formattedCat}" creada.`;
            categoryModalMessage.classList.add('info');
            categoryModalMessage.classList.remove('error');
            newCategoryInput.value = '';
            // --- ¡CAMBIO AQUÍ! CERRAR MODAL AL CREAR ---
            setTimeout(() => { // Pequeño retardo para que el mensaje se vea
                closeAddCategoryModal();
                showCategoryView(formattedCat); // Opcional: ir a la nueva categoría
            }, 800); 
            // ------------------------------------------
        } else {
            categoryModalMessage.textContent = 'La categoría ya existe.';
            categoryModalMessage.classList.add('error');
            categoryModalMessage.classList.remove('info');
        }
    } else {
        categoryModalMessage.textContent = 'Introduce un nombre para la categoría.';
        categoryModalMessage.classList.add('error');
        categoryModalMessage.classList.remove('info');
    }
}


// --- Funciones de Gastos (Añadir, Editar, Eliminar, Renderizar) ---
function handleConfirmExpense() {
    const editingId = confirmExpenseButton.dataset.editingId;
    if (editingId) {
        updateExpense(parseInt(editingId));
    } else {
        addExpense();
    }
}

function addExpense() {
    const amount = parseFloat(modalExpenseAmountInput.value);
    const description = modalExpenseDescriptionInput.value.trim();
    const date = modalExpenseDateInput.value;
    const category = modalExpenseCategorySelect.value;

    if (isNaN(amount) || amount <= 0 || !description || !date || !category) {
        expenseModalMessage.textContent = 'Por favor, rellena todos los campos correctamente.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }

    const newExpense = {
        id: Date.now(),
        amount: amount,
        description: description,
        date: date,
        category: category
    };

    expenses.push(newExpense);
    saveExpenses();
    
    showCategoryView(activeCategory); 
    closeExpenseModal(); 
}

function renderExpensesList(expensesToRender) {
    const expenseListUl = document.getElementById('expense-list'); 
    if (!expenseListUl) return; 

    expenseListUl.innerHTML = '';
    const sortedExpenses = [...expensesToRender].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedExpenses.length === 0) {
        expenseListUl.innerHTML = '<li class="no-expenses">No hay gastos en esta categoría.</li>';
        return;
    }

    sortedExpenses.forEach(expense => {
        const li = document.createElement('li');
        li.classList.add('expense-item');
        li.setAttribute('data-id', expense.id);
        li.innerHTML = `
            <div class="expense-item-details">
                <span><strong>${expense.amount.toFixed(2)}€</strong></span>
                <span>${expense.description}</span>
                <span>${new Date(expense.date).toLocaleDateString('es-ES')}</span>
                <span>Categoría: ${expense.category}</span>
            </div>
            <div class="expense-actions">
                <button class="apple-button-small edit-button" data-id="${expense.id}">Editar</button>
                <button class="apple-button-small delete-button" data-id="${expense.id}">Eliminar</button>
            </div>
        `;
        expenseListUl.appendChild(li);
    });

    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const expenseId = parseInt(e.target.dataset.id);
            openExpenseModal(expenseId);
        });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const expenseId = parseInt(e.target.dataset.id);
            if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
                 deleteExpense(expenseId);
            }
        });
    });
}

function updateExpense(id) {
    const index = expenses.findIndex(exp => exp.id === id);
    if (index === -1) {
        console.error("Gasto no encontrado para actualizar:", id);
        return;
    }

    const amount = parseFloat(modalExpenseAmountInput.value);
    const description = modalExpenseDescriptionInput.value.trim();
    const date = modalExpenseDateInput.value;
    const category = modalExpenseCategorySelect.value;

    if (isNaN(amount) || amount <= 0 || !description || !date || !category) {
        expenseModalMessage.textContent = 'Por favor, rellena todos los campos correctamente para actualizar.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }

    expenses[index] = {
        id: id,
        amount: amount,
        description: description,
        date: date,
        category: category
    };

    saveExpenses();
    showCategoryView(activeCategory); 
    closeExpenseModal(); 
}

function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    saveExpenses();
    showCategoryView(activeCategory); 
}


// --- Función de Exportar a TXT ---
function exportToTxt() {
    if (expenses.length === 0) {
        alert('No hay gastos para exportar.');
        return;
    }

    let exportContent = "Informe de Gastos\n\n";
    exportContent += `Fecha de Generación: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    // Calcular el total global de todos los gastos
    const totalGlobal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    exportContent += `Total Global de Gastos: ${totalGlobal.toFixed(2)}€\n\n`;

    exportContent += "Resumen por Categoría:\n";
    const categoryTotals = {};
    // Solo categorías reales, excluyendo 'General'
    categories.filter(cat => cat !== 'General').forEach(cat => categoryTotals[cat] = 0); 

    expenses.forEach(exp => {
        if (categoryTotals[exp.category] !== undefined) {
            categoryTotals[exp.category] += exp.amount;
        } else if (exp.category && exp.category !== 'General') {
            // Asignar a 'Sin Categoría' si la categoría no existe en la lista actual
            if (!categoryTotals['Sin Categoría']) categoryTotals['Sin Categoría'] = 0;
            categoryTotals['Sin Categoría'] += exp.amount;
        }
    });

    const sortedCategoryKeys = Object.keys(categoryTotals).sort();
    sortedCategoryKeys.forEach(cat => {
        exportContent += `- ${cat}: ${categoryTotals[cat].toFixed(2)}€\n`;
    });
    exportContent += "\n";

    exportContent += "Detalle de Gastos por Categoría:\n";
    
    const groupedExpenses = {};
    // Inicializar todos los grupos con categorías existentes y una para 'Sin Categoría' si es necesario
    categories.filter(cat => cat !== 'General').forEach(cat => groupedExpenses[cat] = []);
    
    // Añadir 'Sin Categoría' como un grupo si hay gastos que no encajan en las categorías existentes
    if (expenses.some(exp => !categories.includes(exp.category) && exp.category !== 'General')) {
        groupedExpenses['Sin Categoría'] = [];
    }

    expenses.forEach(exp => {
        if (groupedExpenses[exp.category]) {
            groupedExpenses[exp.category].push(exp);
        } else {
            // Si la categoría no existe (p.ej., eliminada o mal escrita), agrupar en 'Sin Categoría'
            if (groupedExpenses['Sin Categoría']) {
                groupedExpenses['Sin Categoría'].push(exp);
            }
            // Si 'Sin Categoría' tampoco existe (ej. lista de categorías vacía), simplemente se ignora.
            // Esto es un caso raro si 'General' siempre está, pero es una salvaguarda.
        }
    });

    const sortedGroupedCategoryKeys = Object.keys(groupedExpenses).sort();

    sortedGroupedCategoryKeys.forEach(categoryName => {
        const items = groupedExpenses[categoryName];
        if (items.length > 0) {
            exportContent += `\nCategoría: ${categoryName}\n`;
            items.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
                exportContent += `  - ${new Date(item.date).toLocaleDateString('es-ES')}: ${item.description} (${item.amount.toFixed(2)}€)\n`;
            });
        }
    });

    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const fileName = `mis_gastos_${new Date().toISOString().slice(0, 10)}.txt`;
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(a.href); 
    
    alert('Gastos exportados a ' + fileName);
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', checkAuth);

loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});
logoutButton.addEventListener('click', handleLogout);

addCategoryButton.addEventListener('click', openAddCategoryModal); 
confirmAddCategoryButton.addEventListener('click', addNewCategory); 
cancelAddCategoryButton.addEventListener('click', closeAddCategoryModal); 
addCategoryModal.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) {
        closeAddCategoryModal();
    }
});

manageCategoriesButton.addEventListener('click', openManageCategoriesModal); // Abre el modal de gestión
closeManageCategoriesModalButton.addEventListener('click', closeManageCategoriesModal);
manageCategoriesModal.addEventListener('click', (e) => {
    if (e.target === manageCategoriesModal) {
        closeManageCategoriesModal();
    }
});


confirmExpenseButton.addEventListener('click', handleConfirmExpense); 
cancelExpenseButton.addEventListener('click', closeExpenseModal);
expenseModal.addEventListener('click', (e) => {
    if (e.target === expenseModal) {
        closeExpenseModal();
    }
});