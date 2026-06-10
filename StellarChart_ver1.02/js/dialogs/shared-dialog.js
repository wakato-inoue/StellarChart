let _confirmDialogActive = false;
let _completeDialogActive = false;

function showConfirmDialog(message, onYes, onNo) {
  if (_confirmDialogActive) return;
  _confirmDialogActive = true;

  const dialog = document.getElementById('confirm-dialog');
  const msgEl = document.getElementById('confirm-message');
  msgEl.textContent = message;

  const btnYes = document.getElementById('btn-ok-confirm');
  const btnNo = document.getElementById('btn-cancel-confirm');
  const btnClose = document.getElementById('btn-close-confirm');

  const cleanup = () => {
    _confirmDialogActive = false;
    dialog.removeEventListener('close', handleClose);
    btnYes.removeEventListener('click', handleYes);
    btnNo.removeEventListener('click', handleNo);
    btnClose.removeEventListener('click', handleClose);
  };

  const handleClose = () => { cleanup(); dialog.close(); if (onNo) onNo(); };
  const handleYes = () => { cleanup(); dialog.close(); if (onYes) onYes(); };
  const handleNo = () => { cleanup(); dialog.close(); if (onNo) onNo(); };

  dialog.addEventListener('close', handleClose);
  btnYes.addEventListener('click', handleYes);
  btnNo.addEventListener('click', handleNo);
  btnClose.addEventListener('click', handleClose);

  dialog.showModal();
}

function showCompleteDialog(message, onOk, title) {
  if (_completeDialogActive) return;
  _completeDialogActive = true;

  const dialog = document.getElementById('complete-dialog');
  const msgEl = document.getElementById('complete-message');
  msgEl.textContent = message;

  const titleEl = dialog.querySelector('.dialog-header h2');
  const origTitle = titleEl.textContent;
  if (title) titleEl.textContent = title;

  const btnOk = document.getElementById('btn-ok-complete');
  const btnClose = document.getElementById('btn-close-complete');

  const cleanup = () => {
    _completeDialogActive = false;
    if (title) titleEl.textContent = origTitle;
    dialog.removeEventListener('close', handleClose);
    btnOk.removeEventListener('click', handleOk);
    btnClose.removeEventListener('click', handleClose);
  };

  const handleClose = () => { cleanup(); dialog.close(); if (onOk) onOk(); };
  const handleOk = () => { cleanup(); dialog.close(); if (onOk) onOk(); };

  dialog.addEventListener('close', handleClose);
  btnOk.addEventListener('click', handleOk);
  btnClose.addEventListener('click', handleClose);

  dialog.showModal();
}
