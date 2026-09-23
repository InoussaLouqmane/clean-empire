import * as customAssets from '../customAssets.js';

/**
 * Popup "Ajouter un asset personnalisé" : choisir un fichier image, lui
 * donner un nom, choisir la catégorie (calque) à laquelle il doit se
 * greffer. Ne fait rien lui-même côté données/Phaser — appelle `onSubmit`
 * avec { label, category, dataUrl }, à charge de l'appelant (MapScene)
 * d'enregistrer l'asset et de charger sa texture.
 */
export class AddAssetModal {
  constructor({ onSubmit }) {
    this.onSubmit = onSubmit;
    this._dataUrl = null;

    this._injectStyles();
    this._buildDom();
  }

  _injectStyles() {
    if (document.getElementById('ne-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'ne-modal-styles';
    style.textContent = `
      .ne-modal-backdrop {
        position: fixed; inset: 0; z-index: 1100;
        background: #1b1712aa;
        display: flex; align-items: center; justify-content: center;
      }
      .ne-modal-backdrop[hidden] { display: none; }
      .ne-modal {
        width: 320px; max-width: 90vw;
        background: #1b1712; color: #f1e9d2; border: 2px solid #6b5a46;
        border-radius: 10px; padding: 16px; font: 13px system-ui, sans-serif;
      }
      .ne-modal-title { margin: 0 0 12px; color: #c79a3b; font-size: 15px; }
      .ne-modal-label { display: block; margin: 10px 0 4px; color: #8c7860; }
      .ne-modal-input, .ne-modal input[type="file"] {
        width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 6px;
        border: 2px solid #6b5a46; background: #1b1712; color: #f1e9d2;
        font: 13px system-ui, sans-serif;
      }
      .ne-modal-preview {
        display: block; max-width: 100%; max-height: 120px; margin-top: 8px;
        border: 2px solid #6b5a46; border-radius: 6px; background:
          repeating-conic-gradient(#8c7860 0% 25%, #6b5a46 0% 50%) 50% / 16px 16px;
      }
      .ne-modal-preview[hidden] { display: none; }
      .ne-modal-error {
        margin-top: 8px; color: #f1e9d2; background: #a23b2a; border-radius: 6px;
        padding: 6px 8px; font-size: 12px;
      }
      .ne-modal-error[hidden] { display: none; }
      .ne-modal-actions { display: flex; gap: 8px; margin-top: 14px; }
      .ne-modal-actions button {
        flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer;
        font: 13px system-ui, sans-serif;
      }
      .ne-modal-cancel { background: #6b5a46; color: #f1e9d2; }
      .ne-modal-submit { background: #1f5e52; color: #f1e9d2; }
      .ne-modal-submit:disabled { background: #6b5a46; color: #8c7860; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  }

  _buildDom() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'ne-modal-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.modal = document.createElement('div');
    this.modal.className = 'ne-modal';

    const title = document.createElement('h3');
    title.className = 'ne-modal-title';
    title.textContent = '➕ Ajouter un asset personnalisé';
    this.modal.appendChild(title);

    const maxMb = (customAssets.MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(1);
    const fileLabel = document.createElement('label');
    fileLabel.className = 'ne-modal-label';
    fileLabel.textContent = `Image (${maxMb} Mo max)`;
    this.modal.appendChild(fileLabel);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.addEventListener('change', () => this._onFileChosen());
    this.modal.appendChild(this.fileInput);

    this.preview = document.createElement('img');
    this.preview.className = 'ne-modal-preview';
    this.preview.hidden = true;
    this.preview.alt = '';
    this.modal.appendChild(this.preview);

    const nameLabel = document.createElement('label');
    nameLabel.className = 'ne-modal-label';
    nameLabel.textContent = 'Nom';
    this.modal.appendChild(nameLabel);

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.className = 'ne-modal-input';
    this.nameInput.placeholder = 'ex. Kiosque à journaux';
    this.modal.appendChild(this.nameInput);

    const catLabel = document.createElement('label');
    catLabel.className = 'ne-modal-label';
    catLabel.textContent = 'Catégorie (calque)';
    this.modal.appendChild(catLabel);

    this.categorySelect = document.createElement('select');
    this.categorySelect.className = 'ne-modal-input';
    for (const [value, label] of Object.entries(customAssets.CATEGORY_LABELS)) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this.categorySelect.appendChild(opt);
    }
    this.categorySelect.value = 'details';
    this.modal.appendChild(this.categorySelect);

    this.errorText = document.createElement('div');
    this.errorText.className = 'ne-modal-error';
    this.errorText.hidden = true;
    this.modal.appendChild(this.errorText);

    const actions = document.createElement('div');
    actions.className = 'ne-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'ne-modal-cancel';
    cancelBtn.textContent = 'Annuler';
    cancelBtn.addEventListener('click', () => this.close());
    actions.appendChild(cancelBtn);

    this.submitBtn = document.createElement('button');
    this.submitBtn.type = 'button';
    this.submitBtn.className = 'ne-modal-submit';
    this.submitBtn.textContent = 'Ajouter';
    this.submitBtn.disabled = true;
    this.submitBtn.addEventListener('click', () => this._submit());
    actions.appendChild(this.submitBtn);

    this.modal.appendChild(actions);
    this.backdrop.appendChild(this.modal);
    document.body.appendChild(this.backdrop);
  }

  open() {
    this._reset();
    this.backdrop.hidden = false;
  }

  close() {
    this.backdrop.hidden = true;
  }

  _reset() {
    this.fileInput.value = '';
    this.nameInput.value = '';
    this.categorySelect.value = 'details';
    this.preview.hidden = true;
    this.preview.src = '';
    this.submitBtn.disabled = true;
    this._dataUrl = null;
    this._hideError();
  }

  _onFileChosen() {
    this._hideError();
    const file = this.fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this._showError("Ce fichier n'est pas une image.");
      this.fileInput.value = '';
      return;
    }
    if (file.size > customAssets.MAX_FILE_SIZE_BYTES) {
      const maxMb = (customAssets.MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(1);
      this._showError(`Image trop lourde (${maxMb} Mo max).`);
      this.fileInput.value = '';
      return;
    }

    if (!this.nameInput.value) {
      this.nameInput.value = file.name.replace(/\.[^.]+$/, '');
    }

    const reader = new FileReader();
    reader.onload = () => {
      this._dataUrl = reader.result;
      this.preview.src = this._dataUrl;
      this.preview.hidden = false;
      this.submitBtn.disabled = false;
    };
    reader.onerror = () => this._showError('Impossible de lire ce fichier.');
    reader.readAsDataURL(file);
  }

  _submit() {
    if (!this._dataUrl) return;
    const label = this.nameInput.value.trim() || 'Asset personnalisé';
    const category = this.categorySelect.value;
    this.onSubmit({ label, category, dataUrl: this._dataUrl });
    this.close();
  }

  _showError(message) {
    this.errorText.textContent = message;
    this.errorText.hidden = false;
  }

  _hideError() {
    this.errorText.hidden = true;
  }

  destroy() {
    this.backdrop.remove();
  }
}
