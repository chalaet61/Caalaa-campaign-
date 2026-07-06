document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelector(link.getAttribute('href'))?.scrollIntoView({
        behavior: 'smooth',
      });
    });
  });
});
