class InteractiveTable {
    constructor(tableId, rowsPerPage) {
        this.table = document.getElementById(tableId);
        if (!this.table) return;

        this.preloader = document.getElementById('preloader');

        this.detailsContainer = document.getElementById('contact-details-block');

        // свойства для формы
        this.showFormButton = document.getElementById('show-add-form-button');
        this.formContainer = document.getElementById('add-contact-form-container');
        this.addRowButton = document.getElementById('add-row-button');
        this.validationMessages = document.getElementById('validation-messages');
        this.formInputs = this.formContainer ? Array.from(this.formContainer.querySelectorAll('input, textarea')) : [];

        // система премирования
        this.selectedContactIds = new Set(); // Хранилище ID выбранных сотрудников
        this.generateBonusButton = document.getElementById('generate-bonus-button');
        this.bonusOutputContainer = document.getElementById('bonus-order-output');


        // Элементы управления
        this.tbody = this.table.querySelector('tbody');
        this.headers = this.table.querySelectorAll('.sortable-header');
        this.paginationContainer = document.getElementById('pagination-controls');
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-button');

        // Источник данных
        this.allRows = Array.from(this.tbody.querySelectorAll('tr'));

        // Состояние
        this.rowsPerPage = rowsPerPage;
        this.currentPage = 1;
        this.currentSort = {key: null, direction: 'asc'};
        this.currentFilter = '';

        if (this.allRows.length > 0) {
            this.init();
        }
    }

    init() {
        this.initSorters();
        this.initSearch();
        this.initDetailsView();
        this.initAddForm();
        this.initBonusSystem();
        this.showPreloader();
        setTimeout(() => {
            this.render();
            this.hidePreloader();
        }, 300);
        this.render();
    }

    showPreloader() {
        if (this.preloader) this.preloader.classList.add('visible');
    }

    hidePreloader() {
        if (this.preloader) this.preloader.classList.remove('visible');
    }

     initBonusSystem() {
        this.tbody.addEventListener('change', (event) => {
            const checkbox = event.target;
            if (checkbox.classList.contains('contact-checkbox')) {
                const contactId = checkbox.value;
                if (checkbox.checked) {
                    this.selectedContactIds.add(contactId);
                } else {
                    this.selectedContactIds.delete(contactId);
                }
            }
        });

        this.generateBonusButton.addEventListener('click', () => {
            this.generateBonusOrder();
        });
    }

    generateBonusOrder() {
        if (this.selectedContactIds.size === 0) {
            alert('Пожалуйста, выберите хотя бы одного сотрудника для премирования.');
            this.bonusOutputContainer.classList.remove('visible');
            return;
        }

        const selectedNames = [];
        this.selectedContactIds.forEach(id => {
            const row = this.allRows.find(r => r.querySelector(`.contact-checkbox[value="${id}"]`));
            if (row) {
                const fullName = row.dataset.name;
                const lastName = fullName.split(' ')[0] || fullName;
                selectedNames.push(lastName);
            }
        });

        if (selectedNames.length === 0) return;

        const today = new Date();
        const dateString = today.toLocaleDateString('ru-RU');
        const namesString = selectedNames.join(', ');

        const orderText = `
ПРИКАЗ № ${Math.floor(Math.random() * 100) + 1}-П
г. Минск                                                                 ${dateString}

О премировании сотрудников

ПРИКАЗЫВАЮ:

1. Выплатить единовременную премию по итогам работы за квартал следующим сотрудникам:
   - ${namesString}

2. Главному бухгалтеру произвести выплату премии в установленные сроки.

Директор                                               И.И. Иванов
        `;

        this.bonusOutputContainer.textContent = orderText.trim();
        this.bonusOutputContainer.classList.add('visible');
    }


    initAddForm() {
        const form = document.getElementById('add-contact-form');
        if (!form) return;

        this.showFormButton.addEventListener('click', () => {
            this.formContainer.classList.toggle('visible');
        });

        this.formInputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        form.addEventListener('submit', (event) => {
            const isFormValid = this.validateForm();

            if (!isFormValid) {
                event.preventDefault();
                alert('Пожалуйста, исправьте ошибки в форме перед отправкой.');
            }
            else{
                this.showPreloader();
            }
        });
    }

     validateForm() {
        this.validationMessages.innerHTML = '';
        let areRequiredFieldsFilled = true;

        const photoUrlInput = this.formInputs.find(i => i.id === 'add-photo-url');
        const isPhotoUrlValid = this.validatePhotoUrl(photoUrlInput.value);
        this.updateFieldValidation(photoUrlInput, isPhotoUrlValid, 'URL фото');

        const phoneInput = this.formInputs.find(i => i.id === 'add-phone');
        const isPhoneValid = this.validatePhone(phoneInput.value);
        this.updateFieldValidation(phoneInput, isPhoneValid, 'Номер телефона');

        this.formInputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                areRequiredFieldsFilled = false;
            }
        });

        const isFormValid = areRequiredFieldsFilled && isPhoneValid && isPhotoUrlValid;
        this.addRowButton.disabled = !isFormValid;

        return isFormValid;
    }


    updateFieldValidation(input, isValid, fieldName) {
        const msg = document.createElement('p');
        if (isValid) {
            input.classList.remove('invalid');
            msg.className = 'valid-msg';
            msg.textContent = `${fieldName}: ✓ Валидно`;
        } else {
            input.classList.add('invalid');
            msg.className = 'invalid-msg';
            msg.textContent = `${fieldName}: ✗ Невалидно`;
        }
        this.validationMessages.appendChild(msg);
    }

    validatePhotoUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol;
            const path = parsedUrl.pathname.toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

            return (protocol === "http:" || protocol === "https:") && imageExtensions.some(ext => path.endsWith(ext));
        } catch (e) {
            return false;
        }
    }

    validatePhone(phone) {
        const cleanPhone = phone.replace(/[\s-()]/g, '');
        const regex = /^(\+375\d{9}|80\d{9})$/;
        return regex.test(cleanPhone);
    }


    initDetailsView() {
        if (!this.detailsContainer) return;

        this.tbody.addEventListener('click', (event) => {
            const row = event.target.closest('tr.contact-row');
            if (!row) return;

            this.allRows.forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');

            this.showDetails(row);
        });
    }

    showDetails(row) {
        const data = row.dataset;
        const photoUrl = data.photoUrl || '{% static "images/default_avatar.png" %}';

        this.detailsContainer.innerHTML = `
            <img src="${data.photoUrl}" alt="Фото ${data.name}" onerror="this.src='{% static 'images/doctor_placeholder.png' %}'; this.onerror=null;">
            <div class="details-info">
                <h3>${data.name}</h3>
                <p>${data.description}</p>
                <p><strong>Телефон:</strong> ${data.phone}</p>
                <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            </div>
        `;
        this.detailsContainer.classList.add('visible');
    }

    initSorters() {
        this.headers.forEach(header => {
            header.addEventListener('click', () => this.performSort(header));
        });
    }

    initSearch() {
        if (!this.searchButton || !this.searchInput) return;
        this.searchButton.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') this.performSearch();
        });
    }

    updateHeaderStyles(activeHeader, direction) {
        this.headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
        activeHeader.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }

    render() {
        let processedRows = this.allRows.filter(row => {
            if (!this.currentFilter) return true;
            const nameCell = row.querySelector('[data-cell="name"]');
            return nameCell ? nameCell.textContent.toLowerCase().includes(this.currentFilter) : false;
        });

        if (this.currentSort.key) {
            processedRows.sort((rowA, rowB) => {
                const valueA = rowA.querySelector(`[data-cell="${this.currentSort.key}"]`)?.textContent.trim() || '';
                const valueB = rowB.querySelector(`[data-cell="${this.currentSort.key}"]`)?.textContent.trim() || '';
                const comparison = valueA.localeCompare(valueB, 'ru');
                return this.currentSort.direction === 'asc' ? comparison : -comparison;
            });
        }

        const totalPages = Math.ceil(processedRows.length / this.rowsPerPage);
        this.currentPage = Math.min(this.currentPage, totalPages) || 1;

        this.tbody.innerHTML = '';
        this.paginationContainer.innerHTML = '';

        if (totalPages > 1) {
            this.createPaginationButtons(totalPages);
        }

        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const pageRows = processedRows.slice(startIndex, startIndex + this.rowsPerPage);
         pageRows.forEach(row => {
            const checkbox = row.querySelector('.contact-checkbox');
            if (checkbox) {
                if (this.selectedContactIds.has(checkbox.value)) {
                    checkbox.checked = true;
                } else {
                    checkbox.checked = false;
                }
            }
            this.tbody.appendChild(row);
        });
    }

    changePage(pageNumber) {
        this.showPreloader();
        setTimeout(() => {
            this.currentPage = pageNumber;
            this.render();
            this.hidePreloader();
        }, 200);
    }

    performSearch() {
        this.showPreloader();
        setTimeout(() => {
            this.currentFilter = this.searchInput.value.trim().toLowerCase();
            this.currentPage = 1;
            this.render();
            this.hidePreloader();
        }, 200);
    }

    performSort(header) {
        this.showPreloader();
        setTimeout(() => {
            const sortKey = header.dataset.sortBy;
            const direction = (this.currentSort.key === sortKey && this.currentSort.direction === 'asc') ? 'desc' : 'asc';

            this.currentSort = { key: sortKey, direction };
            this.updateHeaderStyles(header, direction);
            this.currentPage = 1;
            this.render();
            this.hidePreloader();
        }, 200);
    }

    createPaginationButtons(totalPages) {
        this.paginationContainer.appendChild(
            this.createButton('« Назад', () => this.changePage(this.currentPage - 1), this.currentPage === 1)
        );
        for (let i = 1; i <= totalPages; i++) {
            const button = this.createButton(i, () => this.changePage(i));
            if (i === this.currentPage) button.classList.add('active');
            this.paginationContainer.appendChild(button);
        }
        this.paginationContainer.appendChild(
            this.createButton('Вперед »', () => this.changePage(this.currentPage + 1), this.currentPage === totalPages)
        );
    }

    createButton(text, onClick, disabled = false) {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InteractiveTable('interactive-contacts-table', 3);
});