// Projeto conceitual: nada é enviado. A validação nativa (type="email" + required) roda antes do submit.
export function initNewsletter(form) {
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const status = form.querySelector('.newsletter__status');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    input.disabled = true;
    button.disabled = true;
    button.textContent = 'Inscrito!';
    status.textContent = 'Pronto! Este é um projeto conceitual, então nada foi enviado.';
  });
}
