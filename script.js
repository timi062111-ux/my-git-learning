let count = 0;
const countView = document.querySelector('#count');

document.querySelector('#plus').addEventListener('click', () => {
  count += 1;
  countView.textContent = count;
});

document.querySelector('#minus').addEventListener('click', () => {
  count -= 1;
  countView.textContent = count;
});

document.querySelector('#theme').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});
