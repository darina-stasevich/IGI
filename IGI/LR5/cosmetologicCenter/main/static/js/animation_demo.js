document.addEventListener('DOMContentLoaded', () => {

    const parallaxText = document.getElementById('parallax-text');
    const molecule1 = document.getElementById('molecule1');
    const molecule2 = document.getElementById('molecule2');
    const molecule3 = document.getElementById('molecule3');
    const molecule4 = document.getElementById('molecule4');

    window.addEventListener('scroll', () => {
        let scrollValue = window.scrollY;

        if (parallaxText) {
            parallaxText.style.bottom = `-${scrollValue}px`;
        }

        if (molecule1) {
            molecule1.style.transform = `translate(${scrollValue * -0.2}px, ${scrollValue * 0.1}px) scale(${1 + scrollValue * 0.0005}) rotate(${scrollValue * 0.1}deg)`;
        }
        if (molecule2) {
            molecule2.style.transform = `translate(${scrollValue * -0.5}px, ${scrollValue * 0.05}px) scale(${1 + scrollValue * 0.0015})`;
        }
        if (molecule3) {
            molecule3.style.transform = `translate(${scrollValue * 0.15}px, ${scrollValue * -0.1}px) scale(${1 + scrollValue * 0.0002})`;
        }
        if (molecule4) {
            molecule4.style.transform = `translate(${scrollValue * 0.3}px, ${scrollValue * 0.1}px) scale(${1 + scrollValue * 0.001}) rotate(${scrollValue * -0.15}deg)`;
        }
    });

});