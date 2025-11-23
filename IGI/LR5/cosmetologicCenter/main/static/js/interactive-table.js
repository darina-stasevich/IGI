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
        // 1. Слушаем клики по чекбоксам в таблице (делегирование)
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

        // 2. Слушаем клик по кнопке "Премировать"
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
            // Находим строку по ID (значению чекбокса)
            const row = this.allRows.find(r => r.querySelector(`.contact-checkbox[value="${id}"]`));
            if (row) {
                // Извлекаем фамилию (первое слово из полного имени)
                const fullName = row.dataset.name;
                const lastName = fullName.split(' ')[0] || fullName;
                selectedNames.push(lastName);
            }
        });

        if (selectedNames.length === 0) return;

        // Формируем текст приказа
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

        // Отображаем текст и делаем блок видимым
        this.bonusOutputContainer.textContent = orderText.trim();
        this.bonusOutputContainer.classList.add('visible');
    }


    initAddForm() {
        const form = document.getElementById('add-contact-form');
        if (!form) return;

        this.showFormButton.addEventListener('click', () => {
            this.formContainer.classList.toggle('visible');
        });

        // Слушаем ввод в каждое поле для живой валидации
        this.formInputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        // Слушаем событие отправки всей формы
        form.addEventListener('submit', (event) => {
            // Запускаем валидацию еще раз перед отправкой
            const isFormValid = this.validateForm();

            // Если форма НЕ валидна, отменяем ее отправку
            if (!isFormValid) {
                event.preventDefault(); // <-- Отмена отправки
                alert('Пожалуйста, исправьте ошибки в форме перед отправкой.');
            }
            else{
                this.showPreloader();
            }
            // Если форма валидна, мы ничего не делаем, и браузер отправляет ее на сервер
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

        return isFormValid; // <-- Возвращаем итог валидации
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
        // Проверяем, что это валидный URL, начинающийся с http:// или https://
        // и заканчивающийся на расширение картинки.
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol;
            const path = parsedUrl.pathname.toLowerCase();
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

            return (protocol === "http:" || protocol === "https:") && imageExtensions.some(ext => path.endsWith(ext));
        } catch (e) {
            return false; // Если new URL() выдает ошибку, это невалидный URL
        }
    }

    validatePhone(phone) {
        // Удаляем все скобки, дефисы, пробелы
        const cleanPhone = phone.replace(/[\s-()]/g, '');
        // Проверяем, что номер начинается с +375 (и 12 цифр) или 80 (и 11 цифр)
        const regex = /^(\+375\d{9}|80\d{9})$/;
        return regex.test(cleanPhone);
    }


    initDetailsView() {
        if (!this.detailsContainer) return;

        // Используем делегирование событий для tbody
        this.tbody.addEventListener('click', (event) => {
            const row = event.target.closest('tr.contact-row');
            if (!row) return; // Клик был не по строке

            // Снимаем выделение со всех строк
            this.allRows.forEach(r => r.classList.remove('selected'));
            // Выделяем нажатую
            row.classList.add('selected');

            // Показываем детали
            this.showDetails(row);
        });
    }

    showDetails(row) {
        const data = row.dataset;
        const photoUrl = data.photoUrl || '{% static "images/default_avatar.png" %}'; // Укажите путь к вашему фото-заглушке

        this.detailsContainer.innerHTML = `
            <img src="${data.photoUrl}" alt="Фото ${data.name}" onerror="this.src='{% static 'images/doctor_placeholder.png' %}'; this.onerror=null;">
            <div class="details-info">
                <h3>${data.name}</h3>
                <p>${data.description}</p>
                <p><strong>Телефон:</strong> ${data.phone}</p>
                <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            </div>
        `;
        // Делаем блок видимым
        this.detailsContainer.classList.add('visible');
    }

    initSorters() {
        this.headers.forEach(header => {
            header.addEventListener('click', () => this.performSort(header));
        });
    }

    // --- НОВЫЙ МЕТОД ДЛЯ ИНИЦИАЛИЗАЦИИ ПОИСКА ---
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

    // --- ГЛАВНОЕ ИЗМЕНЕНИЕ: ЕДИНАЯ ФУНКЦИЯ РЕНДЕРИНГА СТАЛА УМНЕЕ ---
    render() {
        // 1. ФИЛЬТРАЦИЯ: Начинаем с фильтрации строк
        let processedRows = this.allRows.filter(row => {
            if (!this.currentFilter) return true; // Если фильтр пуст, показываем все
            const nameCell = row.querySelector('[data-cell="name"]');
            return nameCell ? nameCell.textContent.toLowerCase().includes(this.currentFilter) : false;
        });

        // 2. СОРТИРОВКА: Сортируем отфильтрованные строки
        if (this.currentSort.key) {
            processedRows.sort((rowA, rowB) => {
                const valueA = rowA.querySelector(`[data-cell="${this.currentSort.key}"]`)?.textContent.trim() || '';
                const valueB = rowB.querySelector(`[data-cell="${this.currentSort.key}"]`)?.textContent.trim() || '';
                const comparison = valueA.localeCompare(valueB, 'ru', {sensitivity: 'base'});
                return this.currentSort.direction === 'asc' ? comparison : -comparison;
            });
        }

        // 3. ПАГИНАЦИЯ: Вычисляем пагинацию для отфильтрованного и отсортированного результата
        const totalPages = Math.ceil(processedRows.length / this.rowsPerPage);
        this.currentPage = Math.min(this.currentPage, totalPages) || 1; // Убеждаемся, что текущая страница не выходит за пределы

        this.tbody.innerHTML = '';
        this.paginationContainer.innerHTML = '';

        if (totalPages > 1) {
            this.createPaginationButtons(totalPages);
        }

        // 4. ОТРІСОВКА: Показываем итоговый срез строк
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const pageRows = processedRows.slice(startIndex, startIndex + this.rowsPerPage);
         pageRows.forEach(row => {
            // --- ДОБАВЛЕНА ЛОГИКА ВОССТАНОВЛЕНИЯ СОСТОЯНИЯ ---
            const checkbox = row.querySelector('.contact-checkbox');
            if (checkbox) {
                // Проверяем, есть ли ID этой строки в нашем хранилище
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

    // Этот метод будет вызываться при поиске
    performSearch() {
        this.showPreloader();
        setTimeout(() => {
            this.currentFilter = this.searchInput.value.trim().toLowerCase();
            this.currentPage = 1;
            this.render();
            this.hidePreloader();
        }, 200);
    }

    // Этот метод будет вызываться при сортировке
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
        // ... этот метод остается без изменений ...
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