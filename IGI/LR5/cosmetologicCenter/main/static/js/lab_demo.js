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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Находим новые элементы
    const birthDateInput = document.getElementById('birth-date-input');
    const calculateBtn = document.getElementById('calculate-age-btn');
    const resultOutput = document.getElementById('age-result-output');

    // Проверяем, существуют ли элементы, чтобы не вызывать ошибок на других страницах
    if (!calculateBtn) return;

    // 2. Вешаем обработчик на кнопку "Рассчитать"
    calculateBtn.addEventListener('click', () => {
        const birthDateString = birthDateInput.value;
        if (!birthDateString) {
            resultOutput.textContent = 'Пожалуйста, выберите дату рождения.';
            return;
        }

        const birthDate = new Date(birthDateString);
        const today = new Date();

        // 3. Расчет возраста
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        const dayDifference = today.getDate() - birthDate.getDate();

        // Корректируем возраст, если день рождения в этом году еще не наступил
        if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
            age--;
        }

        // 4. Определение дня недели
        const daysOfWeek = [
            'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
            'Четверг', 'Пятница', 'Суббота'
        ];
        const dayOfWeek = daysOfWeek[birthDate.getDay()];

        // 5. Вывод результата в зависимости от возраста
        resultOutput.innerHTML = ''; // Очищаем предыдущий результат

        if (age >= 18) {
            const successMessage = document.createElement('p');
            successMessage.className = 'adult';
            successMessage.textContent = `Вам ${age} лет. Вы родились в этот день недели: ${dayOfWeek}.`;
            resultOutput.appendChild(successMessage);
        } else {
            // Для несовершеннолетних выводим и текстовое сообщение, и alert
            const minorMessage = document.createElement('p');
            minorMessage.className = 'minor';
            minorMessage.textContent = `Вам ${age} лет.`;
            resultOutput.appendChild(minorMessage);

            // Вызываем alert, как требуется в задании
            alert('Внимание! Для использования сайта необходимо разрешение родителей.');
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {

    // ===== ОБЩИЕ ДАННЫЕ =====
    const initialTextbooksData = [
        { subject: 'Физика', author: 'Перышкин А.В.', classNumber: 9 },
        { subject: 'Физика', author: 'Генденштейн Л.Э.', classNumber: 9 },
        { subject: 'Химия', author: 'Рудзитис Г.Е.', classNumber: 10 },
        { subject: 'Алгебра', author: 'Мордкович А.Г.', classNumber: 10 },
        { subject: 'Физика', author: 'Мякишев Г.Я.', classNumber: 10 },
        { subject: 'Физика', author: 'Касьянов В.А.', classNumber: 10 },
        { subject: 'Химия', author: 'Габриелян О.С.', classNumber: 10 },
    ];


    // ====================================================================
    // === ВАРИАНТ 1: ФУНКЦИОНАЛЬНЫЙ СТИЛЬ (ПРОТОТИПНОЕ НАСЛЕДОВАНИЕ) ===
    // ====================================================================
    (function() {
        // --- 1. Определение классов ---

        // Базовый класс "Издание"
        function Publication(author) {
            this._author = author;
        }

        // Getter/Setter для автора
        Publication.prototype.getAuthor = function() { return this._author; };
        Publication.prototype.setAuthor = function(author) { this._author = author; };

        // Производный класс "Учебник"
        function Textbook(subject, author, classNumber) {
            // Вызов конструктора родителя
            Publication.call(this, author);
            this._subject = subject;
            this.classNumber = classNumber;
        }

        // Наследование
        Textbook.prototype = Object.create(Publication.prototype);
        Textbook.prototype.constructor = Textbook;

        // Getter/Setter для предмета (добавлен в наследнике)
        Textbook.prototype.getSubject = function() { return this._subject; };
        Textbook.prototype.setSubject = function(subject) { this._subject = subject; };

        // --- 2. Логика управления ---
        const textbooks = []; // Массив для хранения объектов

        // Метод 3: Добавление объекта с использованием формы
        function addObjectFromForm() {
            const subject = document.getElementById('proto-subject').value;
            const author = document.getElementById('proto-author').value;
            const classNum = parseInt(document.getElementById('proto-class').value);

            if (subject && author && classNum) {
                const newTextbook = new Textbook(subject, author, classNum);
                textbooks.push(newTextbook);
                displayAllObjects(); // Обновляем отображение
            } else {
                alert('Заполните все поля для добавления учебника.');
            }
        }

        // Метод 4: Вывод на страницу всех объектов в массиве
        function displayAllObjects() {
            const outputDiv = document.getElementById('proto-all-objects-output');
            outputDiv.textContent = JSON.stringify(textbooks, null, 2);
        }

        // Метод 5: Вывод результата на страницу
        function displayResult() {
            const classToFind = parseInt(document.getElementById('proto-class-to-find').value);
            if (!classToFind) {
                alert('Введите класс для анализа.');
                return;
            }

            // Фильтруем учебники по нужному классу
            const filteredByClass = textbooks.filter(tb => tb.classNumber === classToFind);

            // Группируем по предмету и собираем уникальных авторов
            const subjectStats = filteredByClass.reduce((acc, tb) => {
                const subject = tb.getSubject();
                const author = tb.getAuthor();
                if (!acc[subject]) {
                    acc[subject] = new Set(); // Используем Set для автоматического отсеивания дублей авторов
                }
                acc[subject].add(author);
                return acc;
            }, {});

            let maxAuthors = 0;
            let resultSubject = 'Не найден';

            // Находим предмет с максимальным числом уникальных авторов
            for (const subject in subjectStats) {
                const authorsCount = subjectStats[subject].size;
                if (authorsCount > maxAuthors) {
                    maxAuthors = authorsCount;
                    resultSubject = subject;
                }
            }

            const resultDiv = document.getElementById('proto-result-output');
            resultDiv.textContent = `Для ${classToFind} класса предмет с наибольшим количеством авторов: ${resultSubject} (${maxAuthors} авт.)`;
        }

        // --- 3. Инициализация ---
        initialTextbooksData.forEach(data => {
            textbooks.push(new Textbook(data.subject, data.author, data.classNumber));
        });

        displayAllObjects();
        document.getElementById('proto-add-btn').addEventListener('click', addObjectFromForm);
        document.getElementById('proto-find-btn').addEventListener('click', displayResult);
    })();


    // =================================================================
    // === ВАРИАНТ 2: КОНСТРУКЦИЯ «CLASS / EXTENDS» (ES6) ===
    // =================================================================
    (function() {
        // --- 1. Определение классов ---

        // Базовый класс "Издание"
        class PublicationES6 {
            constructor(author) {
                this._author = author;
            }
            // Getter/Setter
            get author() { return this._author; }
            set author(value) { this._author = value; }
        }

        // Производный класс "Учебник"
        class TextbookES6 extends PublicationES6 {
            constructor(subject, author, classNumber) {
                super(author); // Вызов конструктора родителя
                this._subject = subject;
                this.classNumber = classNumber;
            }
            // Getter/Setter
            get subject() { return this._subject; }
            set subject(value) { this._subject = value; }
        }

        // --- 2. Логика управления ---
        const textbooks = [];

        // Метод 3: Добавление объекта
        function addObjectFromForm() {
            const subject = document.getElementById('class-subject').value;
            const author = document.getElementById('class-author').value;
            const classNum = parseInt(document.getElementById('class-class').value);

            if (subject && author && classNum) {
                textbooks.push(new TextbookES6(subject, author, classNum));
                displayAllObjects();
            } else {
                alert('Заполните все поля для добавления учебника.');
            }
        }

        // Метод 4: Вывод всех объектов
        function displayAllObjects() {
            const outputDiv = document.getElementById('class-all-objects-output');
            outputDiv.textContent = JSON.stringify(textbooks, null, 2);
        }

        // Метод 5: Вывод результата
        function displayResult() {
            const classToFind = parseInt(document.getElementById('class-class-to-find').value);
            if (!classToFind) {
                alert('Введите класс для анализа.');
                return;
            }

            const filteredByClass = textbooks.filter(tb => tb.classNumber === classToFind);
            const subjectStats = filteredByClass.reduce((acc, tb) => {
                const subject = tb.subject; // Используем геттер
                const author = tb.author; // Используем геттер
                if (!acc[subject]) acc[subject] = new Set();
                acc[subject].add(author);
                return acc;
            }, {});

            let maxAuthors = 0;
            let resultSubject = 'Не найден';

            for (const subject in subjectStats) {
                if (subjectStats[subject].size > maxAuthors) {
                    maxAuthors = subjectStats[subject].size;
                    resultSubject = subject;
                }
            }

            const resultDiv = document.getElementById('class-result-output');
            resultDiv.textContent = `Для ${classToFind} класса предмет с наибольшим количеством авторов: ${resultSubject} (${maxAuthors} авт.)`;
        }

        // --- 3. Инициализация ---
        initialTextbooksData.forEach(data => {
            textbooks.push(new TextbookES6(data.subject, data.author, data.classNumber));
        });

        displayAllObjects();
        document.getElementById('class-add-btn').addEventListener('click', addObjectFromForm);
        document.getElementById('class-find-btn').addEventListener('click', displayResult);
    })();
});

document.addEventListener('DOMContentLoaded', () => {
const speakBtn = document.getElementById('speak-btn');
    const speechText = document.getElementById('speech-text');
    const voiceSelect = document.getElementById('voice-select');

    if (speakBtn && 'speechSynthesis' in window) {
        let voices = [];

        function populateVoiceList() {
            voices = speechSynthesis.getVoices();
            voiceSelect.innerHTML = '';
            voices.forEach((voice, i) => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.default) {
                    option.textContent += ' — По умолчанию';
                }
                option.setAttribute('data-lang', voice.lang);
                option.setAttribute('data-name', voice.name);
                voiceSelect.appendChild(option);
            });
        }

        populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }

        speakBtn.addEventListener('click', () => {
            const utterance = new SpeechSynthesisUtterance(speechText.value);
            const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-name');
            utterance.voice = voices.find(voice => voice.name === selectedOption);
            speechSynthesis.speak(utterance);
        });

    } else if (speakBtn) {
        speakBtn.disabled = true;
        speechText.value = 'Speech Synthesis API не поддерживается вашим браузером.';
    }

    const batteryBtn = document.getElementById('battery-btn');
    const batteryOutput = document.getElementById('battery-output');

    if (batteryBtn) {
        batteryBtn.addEventListener('click', () => {
            if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                    const updateBatteryStatus = () => {
                        batteryOutput.innerHTML = `
                            Уровень заряда: <strong>${Math.round(battery.level * 100)}%</strong> <br>
                            Идет ли зарядка: <strong>${battery.charging ? 'Да' : 'Нет'}</strong>
                        `;
                    };

                    // Обновляем статус сразу и при изменениях
                    updateBatteryStatus();
                    battery.addEventListener('levelchange', updateBatteryStatus);
                    battery.addEventListener('chargingchange', updateBatteryStatus);
                });
            } else {
                batteryOutput.textContent = 'Battery Status API не поддерживается вашим браузером.';
            }
        });
    }
});