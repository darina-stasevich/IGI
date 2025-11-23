function initializeCardHoverEffects() {
    const cardWrappers = document.querySelectorAll(".card-wrapper");

    cardWrappers.forEach(cardWrapper => {
        const card = cardWrapper.querySelector(".card");
        if (!card) return;

        // Инициализируем переменные
        card.style.setProperty("--rotateX", "0deg");
        card.style.setProperty("--rotateY", "0deg");

        const handleMouseMove = (event) => {
            const rect = cardWrapper.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Рассчитываем углы поворота
            const rotateY = ((x - centerX) / centerX) * 10; // уменьшил множитель для более мягкого эффекта
            const rotateX = ((centerY - y) / centerY) * 10; // инвертировал для естественного движения

            // Применяем трансформацию
            card.style.setProperty("--rotateX", `${rotateY}deg`);
            card.style.setProperty("--rotateY", `${rotateX}deg`);
        };

        const handleMouseLeave = () => {
            // Плавно возвращаем в исходное положение
            card.style.transition = 'transform 0.5s ease-out';
            card.style.setProperty("--rotateX", "0deg");
            card.style.setProperty("--rotateY", "0deg");

            // Убираем transition после анимации
            setTimeout(() => {
                card.style.transition = 'transform 0.1s linear';
            }, 500);
        };

        cardWrapper.addEventListener('mousemove', handleMouseMove);
        cardWrapper.addEventListener('mouseleave', handleMouseLeave);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCardHoverEffects();
});