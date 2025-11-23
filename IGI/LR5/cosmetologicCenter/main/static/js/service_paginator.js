class ServicePaginator {
    constructor(listId, paginationId, perPageSelectorId) {
        this.listContainer = document.getElementById(listId);
        this.paginationContainer = document.getElementById(paginationId);
        this.perPageSelector = document.getElementById(perPageSelectorId);

        if (!this.listContainer) return;

        this.allItems = Array.from(this.listContainer.children);
        this.currentPage = 1;
        this.itemsPerPage = parseInt(this.perPageSelector.value, 10);

        this.init();
    }

    init() {
        this.perPageSelector.addEventListener('change', () => {
            this.itemsPerPage = parseInt(this.perPageSelector.value, 10);
            this.changePage(1);
        });

        this.render();
    }

    render() {
        this.listContainer.innerHTML = '';
        this.paginationContainer.innerHTML = '';

        if (this.allItems.length === 0) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = this.allItems.slice(startIndex, startIndex + this.itemsPerPage);

        pageItems.forEach(item => {
            this.listContainer.appendChild(item);
        });

        this.createPaginationButtons();
    }

    createPaginationButtons() {
        const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);
        if (totalPages <= 1) return;

        const container = document.createElement('div');
        container.className = 'pagination-buttons';

        // Кнопка "Назад"
        if (this.currentPage > 1) {
            container.appendChild(this.createButton('←', () => this.changePage(this.currentPage - 1), 'pagination-btn pagination-prev'));
        }

        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                const button = document.createElement('button');
                button.textContent = i;
                button.className = 'pagination-btn active';
                button.disabled = true;
                container.appendChild(button);
            } else {
                container.appendChild(this.createButton(i.toString(), () => this.changePage(i), 'pagination-btn'));
            }
        }

        // Кнопка "Вперед"
        if (this.currentPage < totalPages) {
            container.appendChild(this.createButton('→', () => this.changePage(this.currentPage + 1), 'pagination-btn pagination-next'));
        }

        this.paginationContainer.appendChild(container);
    }

    createButton(text, onClick, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.className = className;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            onClick();
        });
        return button;
    }

    changePage(pageNumber) {
        const totalPages = Math.ceil(this.allItems.length / this.itemsPerPage);
        if (pageNumber < 1 || pageNumber > totalPages) return;

        this.currentPage = pageNumber;
        this.render();
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new ServicePaginator('service-cards-container', 'pagination-container', 'per_page_selector');
});