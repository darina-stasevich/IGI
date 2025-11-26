function initializeCardHoverEffects() {
    const cardWrappers = document.querySelectorAll(".card-wrapper");

    cardWrappers.forEach(cardWrapper => {
        const card = cardWrapper.querySelector(".card");
        if (!card) return;

        card.style.setProperty("--rotateX", "0deg");
        card.style.setProperty("--rotateY", "0deg");

        const handleMouseMove = (event) => {
            const rect = cardWrapper.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateY = ((x - centerX) / centerX) * 10;
            const rotateX = ((centerY - y) / centerY) * 10;

            card.style.setProperty("--rotateX", `${rotateY}deg`);
            card.style.setProperty("--rotateY", `${rotateX}deg`);
        };

        const handleMouseLeave = () => {
            card.style.transition = 'transform 0.5s ease-out';
            card.style.setProperty("--rotateX", "0deg");
            card.style.setProperty("--rotateY", "0deg");

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