document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Получаем все элементы ---
    const showGeneratorCheckbox = document.getElementById('show-generator-checkbox');
    const generatorPanel = document.getElementById('generator-panel');
    const generateBtn = document.getElementById('generate-element-btn');
    const outputContainer = document.getElementById('output-container');
    const testForm = document.getElementById('test-form');
    const testFormActions = document.getElementById('test-form-actions');

    // Элементы управления атрибутами
    const attributeInputs = {
        name: document.getElementById('attr-name'),
        accept: document.getElementById('attr-accept'), // <-- вернули
        capture: document.getElementById('attr-capture'), // <-- вернули
        multiple: document.getElementById('attr-multiple'),
        required: document.getElementById('attr-required'),
    };

    const STORAGE_KEY = 'generatedFileInputs';

    // --- 2. Функции для localStorage (без изменений) ---
    function getStoredElements() { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    function saveElements(elements) { localStorage.setItem(STORAGE_KEY, JSON.stringify(elements)); }

    // --- 3. Функции рендеринга и управления (обновлены) ---
    function renderElement(elementConfig, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'generated-wrapper';
        wrapper.dataset.index = index;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'element-info';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';

        const appliedAttributes = [];

        // Простые атрибуты, которые можно устанавливать как свойства
        if (elementConfig.name) {
            fileInput.name = elementConfig.name;
            appliedAttributes.push(`name="${elementConfig.name}"`);
        }
        if (elementConfig.multiple) {
            fileInput.multiple = true;
            appliedAttributes.push('multiple');
        }
        if (elementConfig.required) {
            fileInput.required = true;
            appliedAttributes.push('required');
        }
        if (elementConfig.accept) {
            fileInput.accept = elementConfig.accept;
            appliedAttributes.push(`accept="${elementConfig.accept}"`);
        }

        // --- ГЛАВНОЕ ИСПРАВЛЕНИЕ ---
        // Для атрибута 'capture' мы ИСПОЛЬЗУЕМ .setAttribute()
        if (elementConfig.capture) {
            // Этот метод надежно добавляет атрибут в HTML-тег
            fileInput.setAttribute('capture', elementConfig.capture);
            appliedAttributes.push(`capture="${elementConfig.capture}"`);
        }

        const attributesPara = document.createElement('p');
        attributesPara.textContent = 'Атрибуты: ' + appliedAttributes.join(', ');

        infoDiv.appendChild(fileInput);
        infoDiv.appendChild(attributesPara);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', () => deleteElement(index));

        wrapper.appendChild(infoDiv);
        wrapper.appendChild(deleteBtn);
        outputContainer.appendChild(wrapper);
    }

    function renderAllElements() {
        outputContainer.innerHTML = '';
        getStoredElements().forEach((config, index) => renderElement(config, index));
        testFormActions.style.display = getStoredElements().length > 0 ? 'block' : 'none';
    }

    function deleteElement(indexToDelete) {
        let elements = getStoredElements();
        elements.splice(indexToDelete, 1);
        saveElements(elements);
        renderAllElements();
    }

    // --- 4. Обработчики событий (обновлены) ---
    showGeneratorCheckbox.addEventListener('change', (e) => {
        generatorPanel.classList.toggle('visible', e.target.checked);
    });

    generateBtn.addEventListener('click', () => {
        // Просто собираем все значения из полей
        const newElementConfig = {
            name: attributeInputs.name.value,
            accept: attributeInputs.accept.value,
            capture: attributeInputs.capture.value,
            multiple: attributeInputs.multiple.checked,
            required: attributeInputs.required.checked,
        };
        const elements = getStoredElements();
        elements.push(newElementConfig);
        saveElements(elements);
        renderAllElements();
    });

    testForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('ok');
    });

    // --- 5. Первоначальная загрузка ---
    renderAllElements();
});