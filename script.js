// --- Constantes y Variables Globales ---
const CORRECT_PIN = "1515"; // Contraseña PIN
const EXPENSES_STORAGE_KEY = 'spentAppExpenses'; // Cambiado a 'spentAppExpenses'
const CATEGORIES_STORAGE_KEY = 'spentAppCategories'; // Cambiado a 'spentAppCategories'

let expenses = [];
let categories = [];
let editingExpenseId = null; // Para saber si estamos editando un gasto
let currentCategoryToDelete = null; // Para saber qué categoría se va a eliminar
let currentExpenseToDelete = null; // Para saber qué gasto se va a eliminar
let activeCategoryName = 'General'; // Mantener el control de la categoría activa

// Referencias del DOM
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const loginMessage = document.getElementById('login-message');
const logoutButton = document.getElementById('logout-button');
const numericKeypad = document.getElementById('numeric-keypad');
const exportButton = document.getElementById('export-button');

const categoryTabsScrollWrapper = document.getElementById('category-tabs-scroll-wrapper');
const mainContent = document.getElementById('main-content');
const generalView = document.getElementById('view-General'); // Referencia directa a la vista General
const generalTotalAmountSpan = document.getElementById('general-total-amount');
const categoriesGrid = document.getElementById('categories-grid');
const addNewCategoryButton = document.getElementById('add-new-category-button'); // Botón de añadir categoría en la vista General
const templateCategoryView = document.getElementById('template-category-view'); // Plantilla para las vistas de categorías

// Modales
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
let categoryToEdit = null; // Variable para almacenar la categoría que se está editando

const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmDeleteMessage = document.getElementById('confirm-delete-message');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const cancelDeleteButton = document.getElementById('cancel-delete-button');
let deleteActionType = ''; // 'category' o 'expense'
let deleteTargetId = null; // ID de la categoría o gasto a eliminar

// --- Funciones de Utilidad ---
function getStoredData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatAmount(amount) {
    return parseFloat(amount).toFixed(2) + '€';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- Lógica de Autenticación ---
function handleLogin() {
    const enteredPin = passwordInput.value;
    if (enteredPin === CORRECT_PIN) {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loginMessage.textContent = '';
        loadAppContent();
    } else {
        loginMessage.textContent = 'PIN incorrecto. Inténtalo de nuevo.';
        passwordInput.value = ''; // Limpiar el input
    }
}

function handleLogout() {
    appContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    passwordInput.value = ''; // Limpiar el campo de PIN
    loginMessage.textContent = ''; // Limpiar cualquier mensaje
    activeCategoryName = 'General'; // Resetear la categoría activa
}

function checkAuth() {
    // Por ahora, siempre muestra el login.
    loginContainer.classList.remove('hidden');
    // Si quisieras que se mantuviera logueado, usarías una flag en localStorage
    // if (localStorage.getItem('isLoggedIn') === 'true') {
    //     loginContainer.classList.add('hidden');
    //     appContainer.classList.remove('hidden');
    //     loadAppContent();
    // } else {
    //     loginContainer.classList.remove('hidden');
    // }
}

// --- Lógica del Teclado Numérico ---
function handleKeypadClick(event) {
    const button = event.target;
    if (button.classList.contains('keypad-button')) {
        const value = button.textContent;
        if (button.classList.contains('clear-button')) {
            passwordInput.value = '';
        } else if (button.classList.contains('delete-button')) {
            passwordInput.value = passwordInput.value.slice(0, -1);
        } else {
            if (passwordInput.value.length < CORRECT_PIN.length) { // Limita la entrada al largo del PIN
                passwordInput.value += value;
            }
            if (passwordInput.value.length === CORRECT_PIN.length) {
                handleLogin(); // Intenta iniciar sesión automáticamente al completar el PIN
            }
        }
    }
}


// --- Lógica de Categorías y Gastos ---

function loadAppContent() {
    expenses = getStoredData(EXPENSES_STORAGE_KEY);
    categories = getStoredData(CATEGORIES_STORAGE_KEY);

    // Asegurarse de que 'General' siempre exista y sea la primera categoría
    const generalExists = categories.some(cat => cat.name === "General");
    if (!generalExists) {
        categories = [{ id: 'general-fixed', name: "General" }]; // Si no existe, solo crea General
    } else {
        // Asegurarse de que General sea el primero y tenga el ID correcto
        const generalCategoryIndex = categories.findIndex(cat => cat.name === "General");
        const generalCategory = categories[generalCategoryIndex];
        // Si el ID no es el fijo, o si no está al principio, lo arreglamos
        if (generalCategory.id !== 'general-fixed' || generalCategoryIndex !== 0) {
            categories = categories.filter(cat => cat.name !== "General");
            categories.unshift({ id: 'general-fixed', name: "General" });
        }
    }
    saveToStorage(CATEGORIES_STORAGE_KEY, categories); // Guarda la lista de categorías (puede haber sido modificada)
    
    renderCategoryTabs();
    renderAllCategoryViews(); // Renderiza todas las vistas de categorías (ocultas)
    renderGeneralView(); // Renderiza y activa la vista "General" por defecto
    activateTab(activeCategoryName); // Activa la pestaña General al inicio
}

function renderCategoryTabs() {
    // Mantener siempre la pestaña "General" en el HTML y añadir las demás
    const generalTabElement = document.querySelector('.category-tab[data-category-name="General"]');
    categoryTabsScrollWrapper.innerHTML = ''; // Limpiar todas las pestañas para reconstruir
    categoryTabsScrollWrapper.appendChild(generalTabElement); // Volver a añadir General

    // Filtrar 'General' para no crear una pestaña duplicada
    const otherCategories = categories.filter(cat => cat.name !== "General");

    if (otherCategories.length === 0 && activeCategoryName !== 'General') {
        // Si no hay otras categorías y la pestaña activa no es General, volvemos a General
        activateTab('General');
    }

    otherCategories.forEach(category => {
        const tab = document.createElement('button');
        tab.classList.add('category-tab');
        tab.textContent = category.name;
        tab.dataset.categoryId = category.id;
        tab.dataset.categoryName = category.name;
        tab.addEventListener('click', () => {
            activateTab(category.name);
        });
        categoryTabsScrollWrapper.appendChild(tab);
    });
}

function activateTab(categoryName) {
    // Activa la pestaña
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.categoryName === categoryName) {
            tab.classList.add('active');
        }
    });

    // Muestra la vista de categoría correspondiente y oculta las demás
    document.querySelectorAll('.category-main-view').forEach(view => {
        if (view.dataset.category === categoryName) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });
    activeCategoryName = categoryName; // Actualizar la categoría activa globalmente
}

function renderGeneralView() {
    // Actualizar el total general
    generalTotalAmountSpan.textContent = formatAmount(calculateTotalExpenses());

    // Renderizar la cuadrícula de categorías (solo categorías editables)
    categoriesGrid.innerHTML = ''; // Limpiar existentes

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

            // Añadir evento para hacer click en el nombre de la categoría (botón) y cambiar de vista
            categoryItem.querySelector('.category-name-button').addEventListener('click', (e) => {
                const clickedCategoryName = e.target.dataset.categoryName;
                activateTab(clickedCategoryName);
            });

            // Añadir listeners para los botones de editar/eliminar categorías
            categoryItem.querySelector('.edit-category-button').addEventListener('click', (e) => {
                const categoryId = e.target.dataset.categoryId;
                openEditCategoryModal(categoryId);
            });

            categoryItem.querySelector('.delete-category-button').addEventListener('click', (e) => {
                const categoryId = e.target.dataset.categoryId;
                const category = categories.find(cat => cat.id === categoryId);
                if (category) {
                    openConfirmDeleteModal('category', category.id, `¿Estás seguro de que quieres eliminar la categoría "${category.name}" y todos sus gastos?`);
                }
            });
        });
    }
}

function renderAllCategoryViews() {
    // Eliminar todas las vistas de categorías (excepto la general que ya está en el HTML)
    document.querySelectorAll('.category-main-view:not(#view-General)').forEach(view => view.remove());

    categories.forEach(category => {
        if (category.name === "General") {
            // La vista General se maneja por separado en renderGeneralView
            return;
        }

        // Clonar la plantilla para cada categoría
        const categoryView = templateCategoryView.cloneNode(true);
        categoryView.id = `view-${category.name.replace(/\s+/g, '-')}`; // Usar un ID válido para el HTML
        categoryView.dataset.category = category.name;
        categoryView.classList.remove('hidden'); // Siempre visible pero inactivo por defecto
        categoryView.classList.remove('active'); // No activar aún
        categoryView.removeAttribute('data-category-template'); // Quitar el atributo de plantilla

        // Actualizar el título y total de la categoría específica
        categoryView.querySelector('.category-specific-title').textContent = category.name.toUpperCase();
        
        // Adjuntar al main-content
        mainContent.appendChild(categoryView);

        // Renderizar los gastos de esta categoría
        renderExpensesForSpecificCategoryView(category.name);

        // Añadir listener para el botón "Añadir Nuevo Gasto" dentro de esta vista
        categoryView.querySelector('.add-expense-category-button').addEventListener('click', () => {
            openExpenseModal(category.name);
        });
    });
}

function renderExpensesForSpecificCategoryView(categoryName) {
    const categoryView = document.getElementById(`view-${categoryName.replace(/\s+/g, '-')}`);
    if (!categoryView) {
        // console.warn(`Vista para la categoría '${categoryName}' no encontrada.`);
        return; // Si la vista no existe (ej. la categoría se acaba de eliminar), salir
    }

    const expenseList = categoryView.querySelector('.expense-list');
    const noExpensesMessage = categoryView.querySelector('.no-expenses');
    
    expenseList.innerHTML = ''; // Limpiar lista de gastos
    const expensesForCategory = expenses.filter(expense => expense.category === categoryName);
    const totalForCategory = calculateTotalExpensesByCategory(categoryName);

    // Actualizar el total en la tarjeta de la categoría específica
    categoryView.querySelector('.category-specific-total').textContent = formatAmount(totalForCategory);

    if (expensesForCategory.length === 0) {
        noExpensesMessage.classList.remove('hidden');
    } else {
        noExpensesMessage.classList.add('hidden');
        expensesForCategory.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha más reciente
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

    // Añadir listeners para los botones de editar y eliminar gastos
    categoryView.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const expenseId = e.target.dataset.id;
            const categoryForExpense = e.target.dataset.category;
            openExpenseModal(categoryForExpense, expenseId);
        });
    });

    categoryView.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const expenseId = e.target.dataset.id;
            const expense = expenses.find(exp => exp.id === expenseId);
            if (expense) {
                openConfirmDeleteModal('expense', expense.id, `¿Estás seguro de que quieres eliminar el gasto "${expense.description}" de ${formatAmount(expense.amount)}?`);
            }
        });
    });
}


function calculateTotalExpenses() {
    return expenses.reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

function calculateTotalExpensesByCategory(categoryName) {
    return expenses
        .filter(expense => expense.category === categoryName)
        .reduce((total, expense) => total + parseFloat(expense.amount), 0);
}

// --- Modales de Categorías ---
function openAddCategoryModal() {
    addCategoryModal.classList.remove('hidden');
    newCategoryInput.value = '';
    categoryModalMessage.textContent = '';
    newCategoryInput.focus();
}

function closeAddCategoryModal() {
    addCategoryModal.classList.add('hidden');
}

function addNewCategory() {
    const categoryName = newCategoryInput.value.trim();
    if (!categoryName) {
        categoryModalMessage.textContent = 'El nombre de la categoría no puede estar vacío.';
        categoryModalMessage.classList.add('error');
        categoryModalMessage.classList.remove('info');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
        categoryModalMessage.textContent = 'Esa categoría ya existe.';
        categoryModalMessage.classList.add('error');
        categoryModalMessage.classList.remove('info');
        return;
    }

    const newCategory = {
        id: generateId(),
        name: categoryName
    };
    categories.push(newCategory);
    saveToStorage(CATEGORIES_STORAGE_KEY, categories);
    categoryModalMessage.textContent = `Categoría "${categoryName}" añadida.`;
    categoryModalMessage.classList.add('info');
    categoryModalMessage.classList.remove('error');
    newCategoryInput.value = '';

    renderCategoryTabs(); // Actualizar las pestañas
    renderGeneralView(); // Actualizar la vista general para que aparezca la nueva categoría
    renderAllCategoryViews(); // Asegura que la nueva vista de categoría esté disponible

    setTimeout(() => {
        closeAddCategoryModal();
    }, 1000);
}

function openEditCategoryModal(categoryId) {
    categoryToEdit = categories.find(cat => cat.id === categoryId);
    if (categoryToEdit) {
        if (categoryToEdit.name === "General") {
            alert("La categoría 'General' no puede ser editada.");
            return;
        }
        editCategoryInput.value = categoryToEdit.name;
        editCategoryModal.classList.remove('hidden');
        editCategoryMessage.textContent = '';
        editCategoryInput.focus();
    }
}

function closeEditCategoryModal() {
    editCategoryModal.classList.add('hidden');
    categoryToEdit = null;
}

function confirmEditCategory() {
    if (!categoryToEdit) return;

    const newCategoryName = editCategoryInput.value.trim();
    if (!newCategoryName) {
        editCategoryMessage.textContent = 'El nombre de la categoría no puede estar vacío.';
        editCategoryMessage.classList.add('error');
        editCategoryMessage.classList.remove('info');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase() && cat.id !== categoryToEdit.id)) {
        editCategoryMessage.textContent = 'Esa categoría ya existe.';
        editCategoryMessage.classList.add('error');
        editCategoryMessage.classList.remove('info');
        return;
    }
    // Ya se comprobó en openEditCategoryModal, pero una doble verificación no está de más
    if (categoryToEdit.name === "General") {
        editCategoryMessage.textContent = "No se puede renombrar la categoría 'General'.";
        editCategoryMessage.classList.add('error');
        editCategoryMessage.classList.remove('info');
        return;
    }

    // Actualizar nombre de la categoría en el array de categorías
    const oldCategoryName = categoryToEdit.name;
    categoryToEdit.name = newCategoryName;
    saveToStorage(CATEGORIES_STORAGE_KEY, categories);

    // Actualizar la categoría de los gastos existentes que pertenecen a esta categoría
    expenses.forEach(expense => {
        if (expense.category === oldCategoryName) {
            expense.category = newCategoryName;
        }
    });
    saveToStorage(EXPENSES_STORAGE_KEY, expenses);

    editCategoryMessage.textContent = `Categoría renombrada a "${newCategoryName}".`;
    editCategoryMessage.classList.add('info');
    editCategoryMessage.classList.remove('error');

    // Re-renderizar todo para asegurar que los cambios se reflejen
    renderCategoryTabs();
    renderGeneralView();
    renderAllCategoryViews(); // Esto recreará las vistas con los nuevos nombres
    activateTab(newCategoryName); // Activar la categoría renombrada

    setTimeout(() => {
        closeEditCategoryModal();
    }, 1000);
}


// --- Modales de Gasto ---
function openExpenseModal(categoryName, expenseId = null) {
    expenseModal.classList.remove('hidden');
    expenseModalMessage.textContent = '';
    modalExpenseCategorySelect.innerHTML = ''; // Limpiar select

    // Llenar el select de categorías
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        modalExpenseCategorySelect.appendChild(option);
    });

    if (expenseId) {
        // Modo edición
        editingExpenseId = expenseId;
        expenseModalTitle.textContent = 'Editar Gasto';
        confirmExpenseButton.textContent = 'Guardar Cambios';
        const expense = expenses.find(exp => exp.id === expenseId);
        if (expense) {
            modalExpenseAmountInput.value = expense.amount;
            modalExpenseDescriptionInput.value = expense.description;
            modalExpenseDateInput.value = expense.date;
            modalExpenseCategorySelect.value = expense.category; // Seleccionar la categoría del gasto
        }
    } else {
        // Modo añadir
        editingExpenseId = null;
        expenseModalTitle.textContent = 'Añadir Nuevo Gasto';
        confirmExpenseButton.textContent = 'Añadir Gasto';
        modalExpenseAmountInput.value = '';
        modalExpenseDescriptionInput.value = '';
        modalExpenseDateInput.value = new Date().toISOString().split('T')[0]; // Fecha actual
        modalExpenseCategorySelect.value = categoryName || categories[0]?.name || ''; // Seleccionar la categoría actual si viene definida
    }
    modalExpenseAmountInput.focus();
}

function closeExpenseModal() {
    expenseModal.classList.add('hidden');
    editingExpenseId = null;
    expenseModalMessage.textContent = '';
}

function handleConfirmExpense() {
    const amount = parseFloat(modalExpenseAmountInput.value);
    const description = modalExpenseDescriptionInput.value.trim();
    const date = modalExpenseDateInput.value;
    const category = modalExpenseCategorySelect.value;

    if (isNaN(amount) || amount <= 0) {
        expenseModalMessage.textContent = 'Por favor, introduce una cantidad válida.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }
    if (!description) {
        expenseModalMessage.textContent = 'Por favor, introduce una descripción.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }
    if (!date) {
        expenseModalMessage.textContent = 'Por favor, selecciona una fecha.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }
    if (!category) {
        expenseModalMessage.textContent = 'Por favor, selecciona una categoría.';
        expenseModalMessage.classList.add('error');
        expenseModalMessage.classList.remove('info');
        return;
    }

    if (editingExpenseId) {
        // Editar gasto existente
        const expenseIndex = expenses.findIndex(exp => exp.id === editingExpenseId);
        if (expenseIndex !== -1) {
            expenses[expenseIndex] = { id: editingExpenseId, amount, description, date, category };
            expenseModalMessage.textContent = 'Gasto actualizado con éxito.';
        }
    } else {
        // Añadir nuevo gasto
        const newExpense = {
            id: generateId(),
            amount,
            description,
            date,
            category
        };
        expenses.push(newExpense);
        expenseModalMessage.textContent = 'Gasto añadido con éxito.';
    }

    saveToStorage(EXPENSES_STORAGE_KEY, expenses);
    expenseModalMessage.classList.add('info');
    expenseModalMessage.classList.remove('error');

    // Actualizar las vistas después de añadir/editar
    renderGeneralView(); // Siempre actualiza la vista general
    renderExpensesForSpecificCategoryView(activeCategoryName); // Actualiza la vista de la categoría activa

    setTimeout(() => {
        closeExpenseModal();
    }, 1000);
}


// --- Modal de Confirmación de Eliminación ---
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

function handleDeleteConfirm() {
    if (deleteActionType === 'category') {
        const category = categories.find(cat => cat.id === deleteTargetId);
        if (category && category.name === "General") {
            alert("No se puede eliminar la categoría 'General'.");
            closeConfirmDeleteModal();
            return;
        }
        deleteCategory(deleteTargetId);
    } else if (deleteActionType === 'expense') {
        deleteExpense(deleteTargetId);
    }
    closeConfirmDeleteModal();
}

function deleteCategory(categoryId) {
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    // Eliminar gastos asociados a la categoría
    expenses = expenses.filter(expense => expense.category !== categoryToDelete.name);
    saveToStorage(EXPENSES_STORAGE_KEY, expenses);

    // Eliminar la categoría
    categories = categories.filter(cat => cat.id !== categoryId);
    saveToStorage(CATEGORIES_STORAGE_KEY, categories);

    // Re-renderizar todo para asegurar que los cambios se reflejen
    renderCategoryTabs();
    renderGeneralView();
    renderAllCategoryViews(); // Esto recreará las vistas
    activateTab('General'); // Vuelve siempre a la vista General
}

function deleteExpense(expenseId) {
    const expenseToDelete = expenses.find(exp => exp.id === expenseId);
    if (!expenseToDelete) return;

    expenses = expenses.filter(expense => expense.id !== expenseId);
    saveToStorage(EXPENSES_STORAGE_KEY, expenses);

    // Actualizar la vista de la categoría actual y la General
    renderGeneralView();
    renderExpensesForSpecificCategoryView(activeCategoryName);
}

// --- Funcionalidad de Exportar a .txt (simulando formato DOCX) ---
function exportDataToTextFile() {
    let textContent = "Reporte de Gastos Spent\n\n";

    // Ordenar categorías alfabéticamente (excepto General)
    const sortedCategories = [...categories].sort((a, b) => {
        if (a.name === "General") return -1; // General siempre primero
        if (b.name === "General") return 1;
        return a.name.localeCompare(b.name);
    });

    sortedCategories.forEach(category => {
        textContent += `Categoría: ${category.name.toUpperCase()}\n`;
        textContent += `Total en ${category.name}: ${formatAmount(calculateTotalExpensesByCategory(category.name))}\n`;
        textContent += "--------------------------------------\n";

        const expensesForCategory = expenses.filter(expense => expense.category === category.name);
        if (expensesForCategory.length === 0) {
            textContent += "  No hay gastos en esta categoría.\n";
        } else {
            expensesForCategory.sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha más reciente
            expensesForCategory.forEach(expense => {
                textContent += `  Fecha: ${formatDate(expense.date)}\n`;
                textContent += `  Cantidad: ${formatAmount(expense.amount)}\n`;
                textContent += `  Descripción: ${expense.description}\n`;
                textContent += "  ---\n";
            });
        }
        textContent += "\n"; // Espacio entre categorías
    });

    const encodedUri = encodeURIComponent(textContent);
    const link = document.createElement("a");
    link.setAttribute("href", `data:text/plain;charset=utf-8,${encodedUri}`);
    link.setAttribute("download", "reporte_gastos_spent.txt"); // Nombre del archivo exportado como .txt
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up

    alert('Reporte de gastos exportado a reporte_gastos_spent.txt');
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', checkAuth);

// Event listeners para el teclado numérico
numericKeypad.addEventListener('click', handleKeypadClick);

// Botones de la App principal
logoutButton.addEventListener('click', handleLogout);
exportButton.addEventListener('click', exportDataToTextFile); // Cambiado a exportar a TXT

// Eventos de modales
addNewCategoryButton.addEventListener('click', openAddCategoryModal); // Botón de añadir categoría en la vista General

confirmAddCategoryButton.addEventListener('click', addNewCategory);
cancelAddCategoryButton.addEventListener('click', closeAddCategoryModal);
addCategoryModal.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) {
        closeAddCategoryModal();
    }
});

confirmExpenseButton.addEventListener('click', handleConfirmExpense);
cancelExpenseButton.addEventListener('click', closeExpenseModal);
expenseModal.addEventListener('click', (e) => {
    if (e.target === expenseModal) {
        closeExpenseModal();
    }
});

confirmEditCategoryButton.addEventListener('click', confirmEditCategory);
cancelEditCategoryButton.addEventListener('click', closeEditCategoryModal);
editCategoryModal.addEventListener('click', (e) => {
    if (e.target === editCategoryModal) {
        closeEditCategoryModal();
    }
});

confirmDeleteButton.addEventListener('click', handleDeleteConfirm);
cancelDeleteButton.addEventListener('click', closeConfirmDeleteModal);
confirmDeleteModal.addEventListener('click', (e) => {
    if (e.target === confirmDeleteModal) {
        closeConfirmDeleteModal();
    }
});

// Listener para la pestaña "General" que siempre está en el HTML
document.querySelector('.category-tab[data-category-name="General"]').addEventListener('click', () => {
    activateTab('General');
});